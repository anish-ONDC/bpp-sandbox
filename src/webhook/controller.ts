import { Request, Response } from "express";
import axios from "axios";
import { appendFileSync, mkdirSync } from "fs";
import path from "path";
import { readNetworkResponse, resolveNetworkId, normalizeContext } from "../utils";
import { fetchShopifyCatalog, fetchShopifyOfferById, parseShopifyProductId } from "../integrations/shopify";
import { saveSelection, getSelection } from "../utils/transactionStore";
import { logForwarding, logDelivered, logFailed, logFallback } from "../utils/logger";

const getPersona = (): string | undefined => {
  return process.env.PERSONA;
};

const getCallbackUrl = (context: Record<string, unknown>, action: string): string => {
  const callbackBase = process.env.BPP_CALLBACK_ENDPOINT;
  if (callbackBase) {
    return `${callbackBase.replace(/\/$/, "")}/on_${action}`;
  }
  const bapUri = context.bapUri;
  if (typeof bapUri !== "string" || !bapUri) {
    throw new Error(
      "Cannot determine callback URL: BPP_CALLBACK_ENDPOINT is unset and context.bapUri is missing"
    );
  }
  return `${new URL(bapUri).origin}/on_${action}`;
};

// Persists every on_<action> callback attempt (delivered or failed) to disk,
// since console output scrolls away / is lost once a background server is killed.
const CALLBACK_LOG_DIR = path.join(__dirname, "..", "..", "logs");
const CALLBACK_LOG_PATH = path.join(CALLBACK_LOG_DIR, "callbacks.log");
mkdirSync(CALLBACK_LOG_DIR, { recursive: true });

const appendCallbackLog = (entry: Record<string, unknown>) => {
  try {
    appendFileSync(CALLBACK_LOG_PATH, JSON.stringify(entry) + "\n");
  } catch {
    // logging is best-effort only; never let it break the actual callback flow
  }
};

const logCallbackSuccess = (
  action: string,
  context: Record<string, unknown>,
  sent: Record<string, unknown>,
  received: unknown
) => {
  logDelivered(action, received);
  appendCallbackLog({
    timestamp: new Date().toISOString(),
    action: `on_${action}`,
    transactionId: context.transactionId,
    status: "delivered",
    sent,
    received,
  });
};
const logCallbackError = (action: string, context: Record<string, unknown>, error: any) => {
  const message = error?.isAxiosError
    ? `${error.code ?? "ERROR"} — ${error.message}`
    : String(error?.message ?? error);
  logFailed(action, message);
  appendCallbackLog({
    timestamp: new Date().toISOString(),
    action: `on_${action}`,
    transactionId: context?.transactionId,
    status: "failed",
    error: message,
  });
};

const buildAckResponse = (context: Record<string, unknown>) => ({
  message: {
    status: "ACK",
    messageId: (context.messageId as string) ?? "",
  },
});

const buildNackResponse = (
  context: Record<string, unknown>,
  code: string,
  message: string
) => ({
  message: {
    status: "NACK",
    messageId: (context.messageId as string) ?? "",
    error: { code, message },
  },
});

const REQUIRED_CONTEXT_FIELDS = ["action", "version", "transactionId", "messageId"] as const;

const validateRequest = (
  req: Request,
  res: Response
): { context: Record<string, unknown>; message: unknown } | null => {
  const rawContext = req.body?.context;

  if (!rawContext || typeof rawContext !== "object") {
    res.status(400).json(buildNackResponse({}, "CTX_MISSING_FIELD", "context is required"));
    return null;
  }

  const context = normalizeContext(rawContext);

  for (const field of REQUIRED_CONTEXT_FIELDS) {
    if (!context[field]) {
      res
        .status(400)
        .json(buildNackResponse(context, "CTX_MISSING_FIELD", `context.${field} is required`));
      return null;
    }
  }

  if (!context.bapId && !context.bppId) {
    res
      .status(400)
      .json(
        buildNackResponse(context, "CTX_MISSING_FIELD", "context.bapId or context.bppId is required")
      );
    return null;
  }

  if (req.body?.message === undefined) {
    res
      .status(400)
      .json(buildNackResponse(context, "SCH_REQUIRED_FIELD_MISSING", "message is required"));
    return null;
  }

  return { context, message: req.body.message };
};

const buildResponseContext = (
  context: Record<string, unknown>,
  action: string
): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    ...context,
    action: `on_${action}`,
  };
  if ("timestamp" in context) {
    result.timestamp = new Date().toISOString();
  }
  return result;
};

// discover/status are the only two actions version-bridge has published
// translation artifacts for, so those two go out as real v3.0.0 and get
// downgraded by the bridge; everything else still goes straight to the BAP
// unchanged, same as before.
const BRIDGED_ACTIONS = new Set(["discover", "status"]);
const ONIX_V3_CALLER_BASE = "http://localhost:8080/bpp/v3-caller";

const getBridgedCallbackUrl = (action: string): string => `${ONIX_V3_CALLER_BASE}/on_${action}`;

// Reshapes a v2.0.0 response into the v3.0.0 shape defined in
// version-bridge/beckn3.yaml, so ONIX's bppV3Validator module actually has
// something real to validate and the bridge has something real to strip
// back out — not just a version number changed in place.
const toV3Payload = (
  action: string,
  payload: Record<string, unknown>
): Record<string, unknown> => {
  const context = payload.context as Record<string, unknown>;
  const v3Context = {
    ...context,
    version: "3.0.0",
    traceId: `trace-${context.transactionId}`,
  };

  const message = { ...(payload.message as Record<string, unknown>) };

  if (action === "discover" && Array.isArray((message as any).catalogs)) {
    message.catalogSummary = (message as any).catalogs.map(
      (catalog: any) =>
        `${catalog?.descriptor?.name ?? catalog?.id}: ${catalog?.resources?.length ?? 0} resources, ${catalog?.offers?.length ?? 0} offers`
    );
  }

  if (action === "status") {
    const contract = (message as any).contract;
    if (contract?.performance) {
      const { performance, ...rest } = contract;
      message.contract = { ...rest, progress: performance };
    }
  }

  return { ...payload, context: v3Context, message };
};

const performAction = (
  req: Request,
  res: Response,
  action: string,
  templateAction: string = `on_${action}`
) => {
  const validated = validateRequest(req, res);
  if (!validated) {
    return;
  }
  const { context } = validated;

  (async () => {
    try {
      const template = await readNetworkResponse(resolveNetworkId(context), templateAction, getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, action),
      };
      const callbackUrl = getCallbackUrl(context, action);
      logForwarding(action, callbackUrl);
      const { data } = await axios.post(callbackUrl, responsePayload);
      logCallbackSuccess(action, context, responsePayload, data);
    } catch (error: any) {
      logCallbackError(action, context, error);
    }
  })();

  return res.status(200).json(buildAckResponse(context));
};

const performTrigger = (req: Request, res: Response, action: string) => {
  const validated = validateRequest(req, res);
  if (!validated) {
    return;
  }
  const { context, message } = validated;

  (async () => {
    try {
      const responsePayload = { message, context: buildResponseContext(context, action) };
      const callbackUrl = getCallbackUrl(context, action);
      logForwarding(action, callbackUrl);
      const { data } = await axios.post(callbackUrl, responsePayload);
      logCallbackSuccess(action, context, responsePayload, data);
    } catch (error: any) {
      logCallbackError(action, context, error);
    }
  })();

  return res.status(200).json(buildAckResponse(context));
};

const buildDiscoverMessage = async (
  context: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  if (process.env.SHOPIFY_SHOP && process.env.SHOPIFY_ADMIN_API_TOKEN) {
    try {
      const catalog = await fetchShopifyCatalog();
      return { message: { catalogs: [catalog] } };
    } catch (error: any) {
      logFallback(`Shopify catalog fetch failed, falling back to static template: ${error?.message ?? error}`);
    }
  }
  return readNetworkResponse(resolveNetworkId(context), "on_discover", getPersona());
};

export const onDiscover = (req: Request, res: Response) => {
  const validated = validateRequest(req, res);
  if (!validated) {
    return;
  }
  const { context } = validated;

  (async () => {
    try {
      const template = await buildDiscoverMessage(context);
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "discover"),
      };
      const v3Payload = toV3Payload("discover", responsePayload);
      const callbackUrl = getBridgedCallbackUrl("discover");
      logForwarding("discover", callbackUrl);
      const { data } = await axios.post(callbackUrl, v3Payload);
      logCallbackSuccess("discover", context, v3Payload, data);
    } catch (error: any) {
      logCallbackError("discover", context, error);
    }
  })();

  return res.status(200).json(buildAckResponse(context));
};

const buildSelectMessage = async (
  context: Record<string, unknown>,
  message: any
): Promise<Record<string, unknown>> => {
  const selectedOffer = message?.contract?.commitments?.[0]?.offer;
  const selectedResource = message?.contract?.commitments?.[0]?.resources?.[0];
  const productId =
    parseShopifyProductId(selectedOffer?.id) ?? parseShopifyProductId(selectedResource?.id);

  if (productId) {
    try {
      const mapped = await fetchShopifyOfferById(productId);
      if (mapped) {
        const transactionId = context.transactionId as string;
        const quantity = selectedResource?.quantity?.count ?? 1;
        const resourceId = (mapped.resource as any).id as string;
        const offerId = (mapped.offer as any).id as string;

        saveSelection(transactionId, {
          productId,
          resourceId,
          offerId,
          quantity,
          price: mapped.price,
          currency: mapped.currency,
        });

        return {
          message: {
            contract: {
              id: `contract-${transactionId}`,
              status: { code: "DRAFT", name: "Quote generated, awaiting init" },
              commitments: [
                {
                  id: `commitment-${transactionId}`,
                  status: { descriptor: { code: "DRAFT" } },
                  resources: [{ id: resourceId, quantity: { count: quantity } }],
                  offer: { id: offerId, resourceIds: [resourceId] },
                },
              ],
              consideration: [
                {
                  id: `consideration-${transactionId}`,
                  status: { code: "QUOTED" },
                  considerationAttributes: {
                    "@context": "https://schema.org",
                    "@type": "PriceSpecification",
                    priceCurrency: mapped.currency,
                    price: mapped.price * quantity,
                  },
                },
              ],
              participants: [
                {
                  id: `provider-${process.env.SHOPIFY_SHOP}`,
                  descriptor: { name: process.env.SHOPIFY_SHOP as string, code: "PROVIDER" },
                },
              ],
            },
          },
        };
      }
    } catch (error: any) {
      logFallback(`Shopify product lookup failed for select, falling back to static template: ${error?.message ?? error}`);
    }
  }

  return readNetworkResponse(resolveNetworkId(context), "on_select", getPersona());
};

export const onSelect = (req: Request, res: Response) => {
  const validated = validateRequest(req, res);
  if (!validated) {
    return;
  }
  const { context, message } = validated;

  (async () => {
    try {
      const template = await buildSelectMessage(context, message);
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "select"),
      };
      const callbackUrl = getCallbackUrl(context, "select");
      logForwarding("select", callbackUrl);
      const { data } = await axios.post(callbackUrl, responsePayload);
      logCallbackSuccess("select", context, responsePayload, data);
    } catch (error: any) {
      logCallbackError("select", context, error);
    }
  })();

  return res.status(200).json(buildAckResponse(context));
};

// Maps PaymentTerm.status (settlementAttributes.status) to the outer
// Settlement.status enum (DRAFT | COMMITTED | COMPLETE per beckn2.yaml) —
// the two are related but distinct fields and must stay consistent.
const SETTLEMENT_STATUS_MAP: Record<string, string> = {
  NOT_PAID: "DRAFT",
  PENDING: "COMMITTED",
  PARTIALLY_PAID: "COMMITTED",
  PAID: "COMPLETE",
  REFUNDED: "COMPLETE",
  FAILED: "DRAFT",
};

interface DynamicContractOptions {
  contractStatus: { code: string; name: string };
  commitmentStatusCode: string;
  considerationStatus: string;
  settlement?: { status: string };
  performance?: { status: string };
  extraParticipants?: any[];
}

/**
 * Rebuilds a Contract for a transaction that was actually selected against a
 * real Shopify product (looked up via the store populated at /select).
 * Returns undefined if this transaction was never a real Shopify selection
 * (e.g. it used a legacy static ID) — callers fall back to the static
 * template in that case, same safety-net pattern as everywhere else.
 */
const buildDynamicContractMessage = async (
  transactionId: string,
  options: DynamicContractOptions
): Promise<Record<string, unknown> | undefined> => {
  const selection = getSelection(transactionId);
  if (!selection) {
    return undefined;
  }

  const mapped = await fetchShopifyOfferById(selection.productId);
  if (!mapped) {
    return undefined;
  }

  const resourceId = (mapped.resource as any).id as string;
  const offerId = (mapped.offer as any).id as string;
  const total = mapped.price * selection.quantity;

  const contract: Record<string, unknown> = {
    id: `contract-${transactionId}`,
    status: options.contractStatus,
    commitments: [
      {
        id: `commitment-${transactionId}`,
        status: { descriptor: { code: options.commitmentStatusCode } },
        resources: [{ id: resourceId, quantity: { count: selection.quantity } }],
        offer: { id: offerId, resourceIds: [resourceId] },
      },
    ],
    consideration: [
      {
        id: `consideration-${transactionId}`,
        status: { code: options.considerationStatus },
        considerationAttributes: {
          "@context": "https://schema.org",
          "@type": "PriceSpecification",
          priceCurrency: mapped.currency,
          price: total,
        },
      },
    ],
    participants: [
      {
        id: `provider-${process.env.SHOPIFY_SHOP}`,
        descriptor: { name: process.env.SHOPIFY_SHOP as string, code: "PROVIDER" },
      },
      ...(options.extraParticipants ?? []),
    ],
  };

  if (options.settlement) {
    contract.settlements = [
      {
        id: `settlement-${transactionId}`,
        considerationId: `consideration-${transactionId}`,
        status: SETTLEMENT_STATUS_MAP[options.settlement.status] ?? "DRAFT",
        settlementAttributes: {
          "@context": "https://schema.beckn.io",
          "@type": "PaymentTerm",
          type: "POST_FULFILLMENT",
          method: "UPI",
          amount: { currency: mapped.currency, value: total },
          status: options.settlement.status,
        },
      },
    ];
  }

  if (options.performance) {
    contract.performance = [
      {
        id: `performance-${transactionId}`,
        status: { code: options.performance.status },
        commitmentIds: [`commitment-${transactionId}`],
      },
    ];
  }

  return { message: { contract } };
};

/** Shared validate -> build -> ACK -> async-callback flow for the dynamic actions below. */
const performDynamicAction = (
  req: Request,
  res: Response,
  action: string,
  buildMessage: (context: Record<string, unknown>, message: any) => Promise<Record<string, unknown>>
) => {
  const validated = validateRequest(req, res);
  if (!validated) {
    return;
  }
  const { context, message } = validated;

  (async () => {
    try {
      const template = await buildMessage(context, message);
      const responsePayload = { ...template, context: buildResponseContext(context, action) };
      const outboundPayload = BRIDGED_ACTIONS.has(action)
        ? toV3Payload(action, responsePayload)
        : responsePayload;
      const callbackUrl = BRIDGED_ACTIONS.has(action)
        ? getBridgedCallbackUrl(action)
        : getCallbackUrl(context, action);
      logForwarding(action, callbackUrl);
      const { data } = await axios.post(callbackUrl, outboundPayload);
      logCallbackSuccess(action, context, outboundPayload, data);
    } catch (error: any) {
      logCallbackError(action, context, error);
    }
  })();

  return res.status(200).json(buildAckResponse(context));
};

const buildInitMessage = async (
  context: Record<string, unknown>,
  message: any
): Promise<Record<string, unknown>> => {
  const transactionId = context.transactionId as string;
  try {
    const buyerParticipant = message?.contract?.participants?.find(
      (p: any) => p?.descriptor?.code === "BUYER"
    );
    const dynamic = await buildDynamicContractMessage(transactionId, {
      contractStatus: { code: "DRAFT", name: "Final terms ready, awaiting confirm" },
      commitmentStatusCode: "DRAFT",
      considerationStatus: "FINALIZED",
      settlement: { status: "NOT_PAID" },
      extraParticipants: buyerParticipant ? [buyerParticipant] : [],
    });
    if (dynamic) {
      return dynamic;
    }
  } catch (error: any) {
    logFallback(`Dynamic init failed, falling back to static template: ${error?.message ?? error}`);
  }
  return readNetworkResponse(resolveNetworkId(context), "on_init", getPersona());
};

const buildConfirmMessage = async (
  context: Record<string, unknown>,
  message: any
): Promise<Record<string, unknown>> => {
  const transactionId = context.transactionId as string;
  try {
    const buyerParticipant = message?.contract?.participants?.find(
      (p: any) => p?.descriptor?.code === "BUYER"
    );
    const dynamic = await buildDynamicContractMessage(transactionId, {
      contractStatus: { code: "ACTIVE", name: "Order confirmed" },
      commitmentStatusCode: "ACTIVE",
      considerationStatus: "CONFIRMED",
      settlement: { status: "PAID" },
      performance: { status: "CONFIRMED" },
      extraParticipants: buyerParticipant ? [buyerParticipant] : [],
    });
    if (dynamic) {
      return dynamic;
    }
  } catch (error: any) {
    logFallback(`Dynamic confirm failed, falling back to static template: ${error?.message ?? error}`);
  }
  return readNetworkResponse(resolveNetworkId(context), "on_confirm", getPersona());
};

const buildStatusMessage = async (context: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const transactionId = context.transactionId as string;
  try {
    const dynamic = await buildDynamicContractMessage(transactionId, {
      contractStatus: { code: "ACTIVE", name: "Order processing" },
      commitmentStatusCode: "ACTIVE",
      considerationStatus: "CONFIRMED",
      settlement: { status: "PAID" },
      performance: { status: "IN_PROGRESS" },
    });
    if (dynamic) {
      return dynamic;
    }
  } catch (error: any) {
    logFallback(`Dynamic status failed, falling back to static template: ${error?.message ?? error}`);
  }
  return readNetworkResponse(resolveNetworkId(context), "on_status", getPersona());
};

const buildCancelMessage = async (context: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const transactionId = context.transactionId as string;
  try {
    const dynamic = await buildDynamicContractMessage(transactionId, {
      contractStatus: { code: "CANCELLED", name: "Cancelled by buyer" },
      commitmentStatusCode: "CLOSED",
      considerationStatus: "CANCELLED",
      settlement: { status: "REFUNDED" },
    });
    if (dynamic) {
      return dynamic;
    }
  } catch (error: any) {
    logFallback(`Dynamic cancel failed, falling back to static template: ${error?.message ?? error}`);
  }
  return readNetworkResponse(resolveNetworkId(context), "on_cancel", getPersona());
};

export const onInit = (req: Request, res: Response) => performDynamicAction(req, res, "init", buildInitMessage);
export const onConfirm = (req: Request, res: Response) =>
  performDynamicAction(req, res, "confirm", buildConfirmMessage);
export const onStatus = (req: Request, res: Response) =>
  performDynamicAction(req, res, "status", (context) => buildStatusMessage(context));
export const onCancel = (req: Request, res: Response) =>
  performDynamicAction(req, res, "cancel", (context) => buildCancelMessage(context));
export const onUpdate = (req: Request, res: Response) => performAction(req, res, "update");
export const onTrack = (req: Request, res: Response) => performAction(req, res, "track");
export const onSupport = (req: Request, res: Response) => performAction(req, res, "support");
export const onRate = (req: Request, res: Response) => performAction(req, res, "rate");

// pre-v2 aliases, kept for backward compat
export const onSearch = (req: Request, res: Response) => performAction(req, res, "search", "on_discover");
export const onRating = (req: Request, res: Response) => performAction(req, res, "rating", "on_rating");

export const triggerOnStatus = (req: Request, res: Response) => performTrigger(req, res, "status");
export const triggerOnCancel = (req: Request, res: Response) => performTrigger(req, res, "cancel");
export const triggerOnUpdate = (req: Request, res: Response) => performTrigger(req, res, "update");

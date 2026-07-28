import { readFileSync } from "fs";
import path from "path";

const RESPONSES_BASE_PATH = path.resolve(__dirname, "../webhook/jsons");

const CONTEXT_FIELD_ALIASES: Record<string, string> = {
  transaction_id: "transactionId",
  message_id: "messageId",
  bap_id: "bapId",
  bap_uri: "bapUri",
  bpp_id: "bppId",
  bpp_uri: "bppUri",
  network_id: "networkId",
  sender_id: "senderId",
  receiver_id: "receiverId",
};

export const normalizeContext = (
  context: Record<string, unknown> | undefined | null
): Record<string, unknown> => {
  if (!context) {
    return {};
  }
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    const canonicalKey = CONTEXT_FIELD_ALIASES[key] ?? key;
    if (normalized[canonicalKey] === undefined || CONTEXT_FIELD_ALIASES[key]) {
      normalized[canonicalKey] = value;
    }
  }
  return normalized;
};

// networkId ("namespace/registry") and domain ("a:b:c:1.0") are structurally
// different, so known networkId values are mapped explicitly rather than
// guessed at.
const KNOWN_NETWORK_ID_FOLDER_ALIASES: Record<string, string> = {
  "beckn.one/logistics-p2p-delivery": "beckn.one.logistics.p2p-delivery",
};

export const normalizeDomain = (domain: string) => {
  if (!domain) {
    return domain;
  }
  if (KNOWN_NETWORK_ID_FOLDER_ALIASES[domain]) {
    return KNOWN_NETWORK_ID_FOLDER_ALIASES[domain];
  }
  return domain
    .replace(/[:/]/g, ".")
    .replace(/\.\d+(?:\.\d+)*$/, "");
};

export const resolveNetworkId = (
  context: Record<string, unknown> | undefined
): string | undefined => {
  if (!context) {
    return undefined;
  }
  const value = context.networkId ?? context.domain;
  return typeof value === "string" ? value : undefined;
};

export const readNetworkResponse = async (
  networkId: string | undefined,
  action: string,
  persona?: string
) => {
  if (!networkId) {
    console.warn(`readNetworkResponse called with no networkId (action: ${action}), returning empty object`);
    return {};
  }
  const normalizedNetworkId = normalizeDomain(networkId);

  if (persona) {
    const personaPath = path.join(
      RESPONSES_BASE_PATH,
      normalizedNetworkId,
      "response",
      persona,
      `${action}.json`
    );

    try {
      const fileContents = readFileSync(personaPath, "utf-8");
      const parsed = JSON.parse(fileContents);
      return parsed;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const targetPath = path.join(
    RESPONSES_BASE_PATH,
    normalizedNetworkId,
    "response",
    `${action}.json`
  );

  try {
    const fileContents = readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(fileContents);
    return parsed;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      console.warn(`File not found: ${targetPath}, returning empty object`);
      return {};
    }
    throw error;
  }
};

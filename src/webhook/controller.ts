import { Request, Response } from "express";
import axios from "axios";
import { readDomainResponse, resolveDomain } from "../utils";

const getCallbackUrl = (context: any, action: string): string => {
  const callbackBase = process.env.BPP_CALLBACK_ENDPOINT;
  if (callbackBase) {
    return `${callbackBase.replace(/\/$/, '')}/on_${action}`;
  }
  const bpp_url = context.bpp_uri || context.bpp_url || context.bppUri || context.bppUrl;
  const full_bpp_url = new URL(bpp_url);
  return `${full_bpp_url.origin}/bpp/caller/on_${action}`;
};

const getPersona = (): string | undefined => {
  return process.env.PERSONA;
};

const buildAck = (context: any) => {
  return { message: { status: "ACK", messageId: context?.messageId ?? context?.message_id ?? "" } };
};

const buildResponseContext = (
  context: Record<string, unknown> | undefined,
  action: string
) => {
  const safeContext = context ?? {};
  const result: Record<string, unknown> = {
    ...safeContext,
    action: `on_${action}`,
  };

  const TIMESTAMP_KEYS = ["timestamp", "time_stamp"] as const;
  const timestampKey = TIMESTAMP_KEYS.find((k) => k in safeContext);
  if (timestampKey) {
    result[timestampKey] = new Date().toISOString();
  }

  return result;
};

export const onSelect = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_select_response.context = { ...context, action: "on_select" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_select", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "select"),
      };
      const callbackUrl = getCallbackUrl(context, "select");
      console.log(
        "Triggering On Select response to:",
        callbackUrl
      );
      const select_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Select api call response: ", select_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

// Compatibility alias for BAPs still using the pre-v2.0.0 "search" verb
// (v2.0.0 renamed search/on_search to discover/on_discover). Reuses the
// same on_discover.json catalog data, just wired to on_search on the wire.
export const onSearch = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_discover", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "search"),
      };
      const callbackUrl = getCallbackUrl(context, "search");
      console.log(
        "Triggering On Search response to:",
        callbackUrl
      );
      const search_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Search api call response: ", search_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onDiscover = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_discover_response.context = { ...context, action: "on_discover" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_discover", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "discover"),
      };
      const callbackUrl = getCallbackUrl(context, "discover");
      console.log(
        "Triggering On Discover response to:",
        callbackUrl
      );
      const discover_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Discover api call response: ", discover_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onInit = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_init_response.context = { ...context, action: "on_init" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_init", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "init"),
      };
      const callbackUrl = getCallbackUrl(context, "init");
      console.log(
        "Triggering On Init response to:",
        callbackUrl
      );
      const init_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Init api call response: ", init_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onConfirm = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_confirm_response.context = { ...context, action: "on_confirm" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_confirm", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "confirm"),
      };
      const callbackUrl = getCallbackUrl(context, "confirm");
      console.log(
        "Triggering On Confirm response to:",
        callbackUrl
      );
      const confirm_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Confirm api call response: ", confirm_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onStatus = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_status_response.context = { ...context, action: "on_status" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_status", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "status"),
      };
      const callbackUrl = getCallbackUrl(context, "status");
      console.log(
        "Triggering On Status response to:",
        callbackUrl
      );
      const status_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Status api call response: ", status_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onUpdate = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_update_response.context = { ...context, action: "on_update" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_update", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "update"),
      };
      const callbackUrl = getCallbackUrl(context, "update");
      console.log(
        "Triggering On Update response to:",
        callbackUrl
      );
      const update_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Update api call response: ", update_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onRating = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;

  // on_rating_response.context = { ...context, action: "on_rating" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_rating", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "rating"),
      };
      const callbackUrl = getCallbackUrl(context, "rating");
      console.log(
        "Triggering On Rating response to:",
        callbackUrl
      );
      const rating_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Rating api call response: ", rating_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onRate = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;

  // on_rating_response.context = { ...context, action: "on_rating" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_rate", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "rate"),
      };
      const callbackUrl = getCallbackUrl(context, "rate");
      console.log(
        "Triggering On Rate response to:",
        callbackUrl
      );
      const rating_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Rate api call response: ", rating_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onSupport = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_support_response.context = { ...context, action: "on_support" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_support", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "support"),
      };
      const callbackUrl = getCallbackUrl(context, "support");
      console.log(
        "Triggering On Support response to:",
        callbackUrl
      );
      const support_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Support api call response: ", support_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onTrack = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_track_response.context = { ...context, action: "on_track" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_track", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "track"),
      };
      const callbackUrl = getCallbackUrl(context, "track");
      console.log(
        "Triggering On Track response to:",
        callbackUrl
      );
      const track_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Track api call response: ", track_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const onCancel = (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  // on_cancel_response.context = { ...context, action: "on_cancel" };
  (async () => {
    try {
      const template = await readDomainResponse(resolveDomain(context), "on_cancel", getPersona());
      const responsePayload = {
        ...template,
        context: buildResponseContext(context, "cancel"),
      };
      const callbackUrl = getCallbackUrl(context, "cancel");
      console.log(
        "Triggering On Cancel response to:",
        callbackUrl
      );
      const cancel_data = await axios.post(
        callbackUrl,
        responsePayload
      );
      console.log("On Cancel api call response: ", cancel_data.data);
    } catch (error: any) {
      console.log(error);
    } finally {
      return;
    }
  })();
  return res.status(200).json(buildAck(context));
};

export const triggerOnStatus = async (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;

  try {
    const callbackUrl = getCallbackUrl(context, "status");
    console.log(
      "Triggering On Status response to:",
      callbackUrl
    );
    const status_data = await axios.post(
      callbackUrl,
      { context, message }
    );
    console.log("On Status api call response: ", status_data.data);
  } catch (error: any) {
    console.log(error);
  }

  return res.status(200).json(buildAck(context));
};

export const triggerOnUpdate = async (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;
  try {
    const callbackUrl = getCallbackUrl(context, "update");
    console.log(
      "Triggering On Update response to:",
      callbackUrl
    );
    const update_data = await axios.post(
      callbackUrl,
      { context, message }
    );
    console.log("On Update api call response: ", update_data.data);
  } catch (error: any) {
    console.log(error);
  }
  return res.status(200).json(buildAck(context));
};

export const triggerOnCancel = async (req: Request, res: Response) => {
  const { context, message }: { context: any; message: any } = req.body;

  try {
    const callbackUrl = getCallbackUrl(context, "cancel");
    console.log(
      "Triggering On Cancel response to:",
      callbackUrl
    );
    const cancel_data = await axios.post(
      callbackUrl,
      { context, message }
    );
    console.log("On Cancel api call response: ", cancel_data.data);
  } catch (error: any) {
    console.log(error);
  }
  return res.status(200).json(buildAck(context));
};

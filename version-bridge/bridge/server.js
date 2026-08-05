// HTTP wrapper around bridge() so ONIX can route to it like any other target.
// Receives a payload, translates it, forwards the result on to the real
// destination, and passes back whatever that destination responded with.

const express = require("express");
const { bridge, BridgeError } = require("./bridge");
const log = require("./logger");

const PORT = 9200;
const REGISTRY_URL = "http://localhost:9100";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/translate/:action", async (req, res) => {
  const action = req.params.action;
  const { target } = req.query;

  log.incoming(action, req.body);

  if (!target) {
    log.failed(action, req.body, "target query param is missing");
    return res.status(400).json({ error: "target query param is required" });
  }

  const sourceVersion = req.body?.context?.version;
  let translated, targetEndpointUrl;
  try {
    ({ payload: translated, targetEndpointUrl } = await bridge({
      payload: req.body,
      action,
      targetSubscriberId: target,
      registryUrl: REGISTRY_URL,
    }));
  } catch (e) {
    if (e instanceof BridgeError) {
      log.failed(action, req.body, e.message);
      return res.status(400).json({ error: e.message });
    }
    throw e;
  }

  log.translated(action, sourceVersion, translated.context.version, translated);

  // Explicit ?forward= overrides the registry lookup, for cases that want
  // to send somewhere other than the target's declared endpointUrl.
  const forward = req.query.forward || (targetEndpointUrl && `${targetEndpointUrl}/${action}`);
  if (!forward) {
    log.failed(action, req.body, "target has no endpointUrl published, and no ?forward= override given");
    return res.status(400).json({ error: `target has no endpointUrl published, and no ?forward= override given` });
  }

  log.forwarding(action, translated, forward);

  let forwardRes;
  try {
    forwardRes = await fetch(forward, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(translated),
    });
  } catch (e) {
    log.failed(action, translated, `could not reach ${forward}: ${e.message}`);
    return res.status(502).json({ error: `forward request failed: ${e.message}` });
  }

  const forwardBody = await forwardRes.text();
  if (forwardRes.ok) {
    log.delivered(action, translated, forwardRes.status);
  } else {
    log.failed(action, translated, `destination responded ${forwardRes.status}: ${forwardBody}`);
  }
  res.status(forwardRes.status).type(forwardRes.headers.get("content-type") || "application/json").send(forwardBody);
});

app.listen(PORT, () => {
  console.log(`bridge server listening on :${PORT}`);
});

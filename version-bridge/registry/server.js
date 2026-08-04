// Registry for the multi-version Beckn bridge.
//   PUT  /manifests                                  publish a manifest
//   GET  /lookup/:namespace/:registry/:recordName     look up a manifest
//   GET  /hops                                        list known adjacent version-pairs
//   GET  /artifacts/:hopFolder/:filename               fetch one translation rule

const express = require("express");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const PORT = 9100;
const MANIFESTS_DIR = path.join(__dirname, "data", "manifests");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const REQUIRED_FIELDS = ["subscriberId", "role", "version", "publishedAt"];
const VALID_ROLES = ["BAP", "BPP"];

function validateManifest(m) {
  if (!m || typeof m !== "object") {
    return "manifest must be a YAML object";
  }
  for (const field of REQUIRED_FIELDS) {
    if (!m[field]) {
      return `missing required field: ${field}`;
    }
  }
  const parts = String(m.subscriberId).split("/");
  if (parts.length !== 3 || parts.some((p) => !p)) {
    return "subscriberId must be namespace/registry/recordName (3 non-empty parts)";
  }
  if (!VALID_ROLES.includes(m.role)) {
    return `role must be one of: ${VALID_ROLES.join(", ")}`;
  }
  return null;
}

const app = express();

app.use((req, _res, next) => {
  console.log(`[version-bridge-registry] ${req.method} ${req.path}`);
  next();
});

app.put("/manifests", express.text({ type: () => true, limit: "100kb" }), (req, res) => {
  let parsed;
  try {
    parsed = yaml.load(req.body);
  } catch (e) {
    return res.status(400).json({ error: `invalid YAML: ${e.message}` });
  }

  const validationError = validateManifest(parsed);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const filename = `${parsed.subscriberId.replace(/\//g, "_")}.yaml`;
  fs.writeFileSync(path.join(MANIFESTS_DIR, filename), req.body, "utf-8");
  console.log(`[version-bridge-registry] published manifest: ${parsed.subscriberId} (${parsed.role}, v${parsed.version})`);
  res.status(201).json({ ok: true, subscriberId: parsed.subscriberId, file: filename });
});

app.get("/lookup/:namespace/:registry/:recordName", (req, res) => {
  const { namespace, registry, recordName } = req.params;
  const subscriberId = `${namespace}/${registry}/${recordName}`;
  const filePath = path.join(MANIFESTS_DIR, `${subscriberId.replace(/\//g, "_")}.yaml`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `no manifest published for subscriberId ${subscriberId}` });
  }

  const parsed = yaml.load(fs.readFileSync(filePath, "utf-8"));
  res.status(200).json({ data: parsed });
});

app.get("/hops", (_req, res) => {
  const hops = fs
    .readdirSync(ARTIFACTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  res.status(200).json({ hops });
});

app.get("/artifacts/:hopFolder/:filename", (req, res) => {
  const filePath = path.join(ARTIFACTS_DIR, req.params.hopFolder, req.params.filename);
  if (!filePath.startsWith(ARTIFACTS_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).type("text/plain").send("artifact not found");
  }
  res.status(200).type("application/jsonata").send(fs.readFileSync(filePath, "utf-8"));
});

app.use((_req, res) => {
  res.status(404).type("text/plain").send("not found");
});

app.listen(PORT, () => {
  console.log(`version-bridge registry listening on :${PORT}`);
});

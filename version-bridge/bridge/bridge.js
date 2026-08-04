// Translates a payload from its own declared version to a target
// participant's declared version, using a single direct hop.

const jsonata = require("jsonata");

class BridgeError extends Error {}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new BridgeError(`GET ${url} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new BridgeError(`GET ${url} failed: ${res.status}`);
  }
  return res.text();
}

async function bridge({ payload, action, targetSubscriberId, registryUrl }) {
  const sourceVersion = payload?.context?.version;
  if (!sourceVersion) {
    throw new BridgeError("payload.context.version is missing — cannot determine source version");
  }

  const parts = targetSubscriberId.split("/");
  if (parts.length !== 3 || parts.some((p) => !p)) {
    throw new BridgeError(`targetSubscriberId must be namespace/registry/recordName, got "${targetSubscriberId}"`);
  }
  const [namespace, registry, recordName] = parts;

  const lookup = await fetchJSON(`${registryUrl}/lookup/${namespace}/${registry}/${recordName}`);
  const targetVersion = lookup.data.version;

  if (sourceVersion === targetVersion) {
    return payload;
  }

  // Folder/file names carry a "v" prefix; version fields in the payload don't.
  const sourceTag = `v${sourceVersion}`;
  const targetTag = `v${targetVersion}`;

  const { hops } = await fetchJSON(`${registryUrl}/hops`);
  const forwardFolder = `${sourceTag}-to-${targetTag}`;
  const reverseFolder = `${targetTag}-to-${sourceTag}`;
  const hopFolder = hops.includes(forwardFolder) ? forwardFolder : hops.includes(reverseFolder) ? reverseFolder : null;

  if (!hopFolder) {
    throw new BridgeError(
      `no direct hop published between ${sourceVersion} and ${targetVersion} — refusing to pass through untranslated`
    );
  }

  const artifactFile = `${action}_from_${sourceTag}_to_${targetTag}.jsonata`;
  const artifactSource = await fetchText(`${registryUrl}/artifacts/${hopFolder}/${artifactFile}`);

  const expr = jsonata(artifactSource);
  const result = await expr.evaluate(payload);

  // Artifacts don't set version themselves — stamp it here after transform.
  result.context = { ...result.context, version: targetVersion };

  return result;
}

module.exports = { bridge, BridgeError };

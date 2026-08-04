# version-bridge

A registry-driven translation layer for bridging participants on different Beckn protocol versions — e.g. a BPP on v3.0.0 talking to a BAP still on v2.0.0 — without either side changing code.

## Why

Beckn-ONIX's own `SchemaVersionMediator` plugin only translates fields nested inside a tagged (`@context`/`@type`) sub-object. It cannot touch `context`, top-level `message` fields, or renamed properties — the exact kind of change a real protocol version bump involves. `version-bridge` solves that class of problem instead: a registry participants publish their declared version to, translation artifacts (JSONata) for adjacent version pairs, and a bridge that looks up both sides and applies the right transform automatically.

## Status

| Phase | What | Status |
|---|---|---|
| 1 | Manifest schema + artifact naming convention | Done |
| 2 | Registry server (publish/lookup manifests, list hops, serve artifacts) | Done |
| 3 | First real version pair (v2.0.0 → v3.0.0) + translation artifacts | Done |
| 4 | Bridge component (reads versions, applies artifacts) | Done |
| 5 | `beckn3.yaml` + wired into a real ONIX module for schema validation | Done |
| 6 | Multi-hop chaining (a second adjacent version pair) | Not started |
| 7 | Full action lifecycle beyond `discover`/`status` | Not started |
| — | Wiring `bridge.js` into ONIX's live request pipeline | Not started |

## Structure

```
docs/                     manifest schema, artifact naming convention, version-pair definitions
examples/manifests/        example manifest instances
registry/                  the registry server
bridge/                    the bridge component + integration test
artifacts/                 translation artifacts, one folder per adjacent version pair
beckn3.yaml                 real spec, modified: context.traceId, Contract.progress (renamed
                             from performance), OnDiscoverAction.catalogSummary
onix-integration/           reference copies of the real ONIX wiring (adapter.yaml module,
                             routing config) — ONIX itself lives in a separate, never-pushed clone
test/                       standalone JSONata artifact test harness
```

## Running the registry

```bash
cd registry
npm install
npm start          # listens on :9100
```

## Running the bridge's integration test

Requires the registry running first (above):

```bash
cd bridge
npm install
node test.js
```

## Testing translation artifacts directly

```bash
cd test
npm install
node run.js
```



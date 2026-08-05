# version-bridge

A registry-driven translation layer for bridging participants on different Beckn protocol versions — e.g. a BPP on v3.0.0 talking to a BAP still on v2.0.0 — without either side changing code.


## Status

| Phase | What | Status |
|---|---|---|
| 1 | Manifest schema + artifact naming convention | Done |
| 2 | Registry server (publish/lookup manifests, list hops, serve artifacts) | Done |
| 3 | First real version pair (v2.0.0 → v3.0.0) + translation artifacts | Done |
| 4 | Bridge component (reads versions, applies artifacts) | Done |
| 5 | `beckn3.yaml` + wired into a real ONIX module for schema validation | Done |
| 6 | Multi-hop chaining (a second adjacent version pair) | Not started |
| 7 | Full v3.0.0 lifecycle — real artifacts for `select`/`init`/`confirm`/`cancel` | Done |
| — | Wiring `bridge.js` into ONIX's live request pipeline (outbound: BPP response → BAP) | Done |
| — | Wiring inbound direction (real BAP request → upgraded before reaching backend) | Done |
| — | Manifests declare `endpointUrl`; bridge resolves forward destination from the registry instead of it being hardcoded per routing rule | Done |
| — | Live cross-machine test against a real other machine, full lifecycle | Done |

## Structure

```
docs/                     manifest schema, artifact naming convention, version-pair definitions,
                           live cross-machine test guide
examples/manifests/        example manifest instances
registry/                  the registry server
bridge/                    the bridge component: bridge.js (translation), server.js (HTTP wrapper
                            ONIX routes to), logger.js (terminal + logs/bridge.log), integration test
artifacts/                 translation artifacts, one folder per adjacent version pair
beckn3.yaml                 real spec, modified: context.traceId, Contract.progress (renamed
                             from performance), OnDiscoverAction.catalogSummary
onix-integration/           reference copies of the real ONIX wiring (adapter.yaml modules for
                             both directions, routing configs) — ONIX itself lives in a separate,
                             never-pushed clone
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

## Backend side of this

Getting a real BPP to actually exercise the bridge (rather than just proving the ONIX/registry mechanics with synthetic payloads) needed a change on the BPP's own backend, which lives on that project's own branch, not duplicated here: every `on_<action>` handler builds genuine v3.0.0 content (`traceId` always, `catalogSummary` on `on_discover`, `progress` wherever a response actually carries fulfillment data) and sends it through ONIX's v3.0.0-validating module instead of calling the BAP directly — that's what actually gives the bridge something real to strip back out. `update`/`track`/`support`/`rate` still call the BAP directly; no translation artifacts exist for those.

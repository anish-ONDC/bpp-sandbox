# Bridge Artifact Convention

Defines how a translation rule (one JSONata file, converting one action's full payload from one version's shape to an adjacent version's shape) is named and located.

## Grounding

- **JSONata** as the transformation language is not a choice made here — it's the real language Beckn-ONIX's own plugins (`reqmapper`, `schemaversionmediator`) already use for this exact class of problem, confirmed directly from their source earlier in this project. Using anything else would mean re-solving a problem Beckn-ONIX has already solved.
- The naming pattern below (`{action}_from_{fromVersion}`) deliberately mirrors the real, verified convention found in `schemaversionmediator.go`'s own `deriveArtifactURL` function (`{Type}_from_{fromVersion}`) — generalized from "domain object type" to "action name," since this bridge operates on whole action payloads rather than a tagged sub-object. Reusing a proven naming shape rather than inventing an unrelated one.
- Action names (`discover`, `on_discover`, `select`, `on_select`, ...) are the real action names defined in the Beckn v2.0.0 spec (`reference/beckn2.yaml`) — not placeholders.

## Directory layout

```
version-bridge/
  artifacts/
    v2.0.0-to-v3.0.0/
      discover_from_v2.0.0_to_v3.0.0.jsonata       # request direction: BAP (v2.0.0) -> BPP (v3.0.0)
      on_discover_from_v3.0.0_to_v2.0.0.jsonata     # response direction: BPP (v3.0.0) -> BAP (v2.0.0)
      select_from_v2.0.0_to_v3.0.0.jsonata
      on_select_from_v3.0.0_to_v2.0.0.jsonata
      ...
    v3.0.0-to-v3.1.0/
      ...
```

- One folder per **adjacent** version pair — never a folder for two versions that aren't directly next to each other. A hop between non-adjacent versions (e.g. v2.0.0 → v3.1.0) is resolved by chaining through each intermediate folder in sequence, computed by the bridge component (Phase 4), not by a directly-authored artifact.
- Folder name states both versions in the pair, oldest first, regardless of which direction a given file inside it translates — keeps every artifact for one version transition physically together.

## File naming

```
{action}_from_{fromVersion}_to_{toVersion}.jsonata
```

- `{action}` — the real Beckn action name this artifact applies to, exactly as it appears in the spec (`discover`, `on_discover`, `select`, `on_select`, `init`, `on_init`, `confirm`, `on_confirm`, `status`, `on_status`, `cancel`, `on_cancel`).
- `{fromVersion}` / `{toVersion}` — full version strings (`v2.0.0`, `v3.0.0`), matching the real `context.version` value each side declares.
- Each adjacent pair needs **two** files per action that actually changes shape between those versions — one per direction. A request-only action (like `discover`) only needs its request-direction artifact if the BAP-to-BPP leg changes shape; the same logic applies independently to the response leg (`on_discover`). They are not assumed to mirror each other automatically — each is authored and reviewed separately, same as the real, verified pattern already used successfully elsewhere in this project (`reqmapper`'s separate `bapMappings`/`bppMappings`).

## What an artifact contains

- A single JSONata expression, taking the full source-version payload as input and producing the full target-version payload as output — not scoped to a sub-object, unlike the (different, already-explored) `SchemaVersionMediator` artifacts.
- Only the `message` body is transformed this way. `context` fields that need changing (a rename, or `version` itself) are handled within the same expression, since the whole payload — `context` and `message` together — is the input.

## What this convention deliberately excludes (for Phase 1)

- No artifact yet exists for any action — Phase 1 only fixes the naming/location rule. Real artifacts are written in a later phase, against one real, agreed version pair.
- No signing or authorship metadata on artifact files yet — deferred until the trust/access-control question (already raised and answered at a policy level) is implemented for real.

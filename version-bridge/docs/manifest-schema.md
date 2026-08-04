# Manifest Schema

Defines what a participant publishes to the registry to declare which Beckn protocol version it currently speaks.

## Grounding

- `subscriberId` format (`namespace/registry/recordName`, exactly 3 non-empty parts) matches the real DeDi lookup convention used by Beckn-ONIX's own registry plugins — verified directly against `dediregistry.go`'s `LookupNode` implementation earlier in this project, not invented here.
- `version` matches the real field name in Beckn's own `Context` schema (`reference/beckn2.yaml`). In the current, live v2.0.0 spec this field is hard-locked (`const: 2.0.0`) — there is no real mechanism today for a payload to declare any other value. This confirms the premise of this whole project: multi-version coexistence is a capability that does not exist natively in the current spec, which is exactly why a custom bridge is required, and why this manifest schema treats `version` as a real, load-bearing field rather than a formality.
- `role` (`BAP`/`BPP`) matches the real terms used throughout the Beckn v2.0.0 spec's `Context` schema (`bapId`, `bppId`).

## Shape

```yaml
subscriberId: string      # required, exactly 3 slash-separated parts: namespace/registry/recordName
role: string               # required, one of: BAP, BPP
version: string             # required, the Beckn protocol version this participant currently speaks (e.g. "2.0.0")
publishedAt: string          # required, ISO 8601 timestamp of when this declaration was published
```

## Field notes

- **`subscriberId`** — the participant's registry identity. Must be unique per participant. Same validation rule as the real DeDi convention: reject anything that isn't exactly 3 non-empty, slash-separated segments.
- **`role`** — determines which direction a request naturally flows in when this participant is involved (matches the real Beckn distinction between the two actor types, not an invented category).
- **`version`** — a single string. Deliberately **not** a list — a real participant speaks one protocol version at a time, unlike a domain-pack extension (a different, narrower concept explored and abandoned earlier in this project) where a participant might support a range of sub-schema versions simultaneously. One participant, one declared protocol version, at any given moment.
- **`publishedAt`** — lets the registry (or an operator) determine how stale a declaration is. Not used for correctness in Phase 1, but present from the start so later phases don't need a schema migration to add it.

## What this schema deliberately excludes

- No field describing the participant's actual endpoint URL, signing keys, or network membership — those are real DeDi registry concerns, already handled by other parts of a real Beckn deployment, and out of scope for what this manifest needs to declare.
- No per-action or per-object versioning — that is what the (different, already-explored, and structurally limited) `SchemaVersionMediator` mechanism does. This manifest is intentionally simpler: one version, for the whole protocol, per participant.

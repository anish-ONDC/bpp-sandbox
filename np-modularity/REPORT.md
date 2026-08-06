# Report — does the seller's own code have to change when the rules change?

## What was tested

One question: when the network's rules change (a new field gets added, or a field gets renamed), does the seller's own data and business logic have to change too — or can only the Mapper (the piece in between) change?

Tested using real data — a live Shopify store, 17 real products — and the real Beckn v2.0.0 spec, plus a made-up "v3.0.0" with two real, deliberate changes: a new field (`catalogSummary`) and a renamed field (`performance` → `progress`).

## Result

**All 18 checks passed.** The seller's own data never changed, for any action, under either version.

| Action | v1 output valid (v2.0.0 rules) | v2 output valid (v3.0.0 rules) | Actually delivered |
|---|---|---|---|
| discover | PASS | PASS | PASS |
| select | PASS | PASS | PASS |
| init | PASS | PASS | PASS |
| confirm | PASS | PASS | PASS |
| status | PASS | PASS | PASS |
| cancel | PASS | PASS | PASS |

## Steps taken

**1. Got real seller data.** Pulled all 17 products from a live Shopify store, exactly as Shopify returns them. No shaping, no edits.

**2. Got the real rules.** Full copies of the real `beckn2.yaml` spec, and a version with two changes made to it (`beckn3.yaml`) — nothing else touched.

**3. Built a Mapper, targeting today's rules.** One piece of code that turns the seller's data into the shape every action needs — `discover`, `select`, `init`, `confirm`, `status`, `cancel`. Checked every output against the real v2.0.0 rules. All passed.

**4. Built a second version of the same Mapper, targeting the new rules.** Same seller data, completely untouched. This version adds `catalogSummary` on discover, and renames `performance` to `progress` wherever a contract has fulfillment info. Checked every output against the new rules. All passed.

**5. Confirmed the new version genuinely fails the old rules directly** — not just passes the new ones. A response carrying `catalogSummary` was checked against the *old* v2.0.0 rules and correctly rejected, since that field isn't something the old rules allow. This confirms the check itself is real, not just agreeing with everything.

**6. Delivered the output for real.** Sent every v2.0.0 response to an actual running mock buyer-app webhook over real HTTP, and confirmed it was received — not just valid in isolation.


## Test Details

`catalogSummary`, computed for real from the real catalog:
```
"catalogSummary": ["bpp-test-store-dyixnsi5 — Live Shopify Catalog: 17 resources, 17 offers"]
```

The rename, on a real `on_confirm` response — same order, same data, only the field name differs:
- v1 (v2.0.0): `"performance": [{ "id": "performance-...", "status": { "code": "CONFIRMED" }, ... }]`
- v2 (v3.0.0): `"progress": [{ "id": "performance-...", "status": { "code": "CONFIRMED" }, ... }]`



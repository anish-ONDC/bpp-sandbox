# np-modularity

A small, standalone check on a different question than `version-bridge` answers. That project asked: can two different NPs, on two different protocol versions, still talk to each other. This one asks: inside a single NP, if the Mapper changes or the Protocol shape changes, does the NP's own business code have to change too — or does the Mapper actually absorb it.

Kept as its own project on purpose. Proving something is separable by building it bolted onto the thing it's supposed to be separate from would defeat the point.

## Status

| Phase | What | Status |
|---|---|---|
| 1 | Pull the seller's real data (Shopify), save it untouched | Done |
| 2 | Pull out the real Protocol model pieces (v2.0.0 and the hypothetical v3.0.0) | Not started |
| 3 | Pull the Mapper out as its own piece, separate from business logic | Not started |
| 4 | Build a second Mapper version that targets the new Protocol shape | Not started |
| 5 | Get a schema checker working | Not started |
| 6 | Prove the seller's data never had to change across both Mapper versions | Not started |

## Phase 1 — the seller's real data

`fetch-shopify-data.js` pulls every product from the real Shopify store, exactly as Shopify returns it — no shaping, no filtering, nothing Beckn about it. Saved to `data/shopify-raw-products.json`.

This is deliberately the full response, not the trimmed-down version `bpp-sandbox-v2`'s own integration uses today. Worth seeing the whole thing once, since later phases need to know what's actually available to map from — fields like `tags`, `handle`, and `admin_graphql_api_id` exist in the real data and aren't used anywhere yet.

```bash
npm install
node fetch-shopify-data.js
```

Needs `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_API_TOKEN` in `.env` (see `.env.example`). `data/` is not committed — it's real store data, regenerate it locally instead.

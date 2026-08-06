# np-modularity

A small, standalone check on a different question than `version-bridge` answers. That project asked: can two different NPs, on two different protocol versions, still talk to each other. This one asks: inside a single NP, if the Mapper changes or the Protocol shape changes, does the NP's own business code have to change too — or does the Mapper actually absorb it.

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

`fetch-shopify-data.js` pulls every product from the real Shopify store, exactly as Shopify returns it. Saved to `data/shopify-raw-products.json`.


```bash
npm install
node fetch-shopify-data.js
```

Needs `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_API_TOKEN` in `.env` (see `.env.example`). `data/` is not committed — it's real store data, regenerate it locally instead.

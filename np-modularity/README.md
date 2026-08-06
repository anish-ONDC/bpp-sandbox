# np-modularity

This checks one thing: when something changes on the network side — the shape data has to be sent in, or the rules that shape has to follow — does the seller's own code have to change too? Or can it stay exactly the same?

Inside a seller's system there are three parts: their own data, something in the middle that turns that data into the shape the network expects, and the rules that shape has to follow. When the rules change, only the middle part should need to change. The seller's own data and code should never have to.

## Getting the seller's real data

`fetch-shopify-data.js` pulls every product from the real Shopify store, exactly as Shopify returns it. Saved to `data/shopify-raw-products.json`.

```bash
npm install
node fetch-shopify-data.js
```

Needs `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_API_TOKEN` in `.env` (see `.env.example`). `data/` is not committed — it's real store data, regenerate it locally instead.

## Checking data against the real rules

`schemas/` holds the real spec files — `beckn2.yaml` (today's rules) and `beckn3.yaml` (the same rules, plus `catalogSummary`). Kept as complete files so a schema's internal dependencies still resolve correctly.

`check-schema.js` loads one of these files and checks a piece of data against one named rule inside it, e.g. `OnDiscoverAction`. `OnDiscoverAction` rejects any field it doesn't know about in the real v2.0.0 file, so data carrying `catalogSummary` fails against `beckn2.yaml` and passes against `beckn3.yaml`. Later phases use this to check the Mapper's output against the rules it's supposed to follow.

## The Mapper

`mapper/v1.js` turns the seller's own product data into the shape a v2.0.0 `on_discover` response needs. No network calls inside it — data in, data out, nothing else. Everything it produces has to actually pass the real rules in `beckn2.yaml`, checked, not assumed.

```bash
node run-mapper-v1.js
```

Runs the mapper against the real, already-fetched product data, then checks the result against the real `OnDiscoverAction` rule. Also confirms the seller's own saved data file is byte-for-byte unchanged before and after — the whole point of pulling the Mapper out on its own.

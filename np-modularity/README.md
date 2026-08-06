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

`mapper/v1.js` turns the seller's own data into the v2.0.0 shape for every response — `discover`, `select`, `init`, `confirm`, `status`, `cancel`. `mapper/v2.js` does the same for v3.0.0: `catalogSummary` on discover only, and `progress` instead of `performance` wherever a contract actually carries fulfillment data. Both share the same building blocks (`mapper/shared.js` for products, `mapper/contract-shared.js` for orders) — those haven't changed between versions, only the parts that actually differ have. No network calls in either mapper.

`fixtures/sample-order.json` is the seller's own record of one order — their own shape, not Beckn's, used for select/init/confirm/status/cancel the same way the real product data is used for discover.

```bash
node run-mapper-v1.js
node run-mapper-v2.js
```

Each checks its output against the matching real rule for discover.

## Full test, every action, both versions

```bash
node mock-bap-webhook.js   # separate terminal
node test-all-actions.js
```

Runs both mapper versions for all six actions, checks each output against its real matching rule, and actually delivers the v2.0.0 output to a mock BAP webhook to confirm it's genuinely receivable, not just schema-valid in isolation. Everything — what was built, whether it validated, whether it was delivered — gets written to `logs/callbacks.log`, so it can be reviewed afterward instead of only scrolling past in a terminal.

One real bug this caught: `Contract.id` requires a UUID in the real spec. The first version used a human-readable ID and failed validation immediately — fixed by having the seller's own order record carry a real UUID for its contract, the way an actual order system would once a contract exists, rather than the Mapper inventing one.

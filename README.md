# Retail BPP — Shopify-backed (Beckn v2.0.0)

Seller-side implementation (BPP — Beckn Provider Platform) for a retail use case, built on the [Beckn Sandbox](https://github.com/beckn/sandbox) for the [Beckn v2.0.0 protocol](https://github.com/beckn/protocol-specifications-new).

This branch pulls the actual catalog from a live Shopify store instead of returning static demo data. `/discover` and `/select` hit Shopify's Admin API directly and return real products, real prices, real stock — and `/init`, `/confirm`, `/status`, `/cancel` carry that same real product through the rest of the order lifecycle. If Shopify isn't reachable for any reason (bad token, store down, not configured), everything falls back to the old static JSON templates instead of failing — so a demo never just breaks because Shopify hiccuped.

## How it works

Every Beckn action has two legs:
1. **Request** — a buyer-side app (BAP) POSTs an action (e.g. `/discover`) to this server. It replies instantly with just an ACK.
2. **Callback** — in the background, this server builds the real response (fetching from Shopify where applicable), rebuilds the context, and POSTs it separately to the buyer side's `on_<action>` callback endpoint. That's where the actual data lands.

```
Buyer side                          This server (Seller side / BPP)
   |-- POST /discover --------------->|
   |<----------- ACK -----------------|
   |                                  |  (fetches live Shopify catalog,
   |                                  |   or falls back to static JSON)
   |<---- POST on_discover -----------|
   |------------- ACK --------------->|
```

Same pattern for every action.

- `discover`, `select`, `init`, `confirm`, `status`, `cancel` — Shopify-backed, with static fallback
- `update`, `track`, `support`, `rate` — static templates only
- `trigger/on_status`, `trigger/on_cancel`, `trigger/on_update` — manual endpoints to push a callback yourself, without a matching incoming request (useful for testing "order shipped"-type notifications)

Static fallback templates still live at:
```
src/webhook/jsons/beckn.one.logistics.p2p-delivery/response/
src/webhook/jsons/ONDC.LOG10/response/
```

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
BPP_CALLBACK_ENDPOINT=<the buyer side's public URL>

SHOPIFY_SHOP=your-store-name
SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxxxxx
```

`SHOPIFY_SHOP` is just the store name, not the full domain (so `my-store`, not `my-store.myshopify.com`). The token comes from Settings → Apps and sales channels → Develop apps in your Shopify admin — create a custom app, give it at least `read_products` access, install it, and it'll give you the token.

If you leave the Shopify vars unset, the server just runs on static data the whole time, same as before this branch existed.

`BPP_CALLBACK_ENDPOINT` is where every `on_<action>` callback gets sent — has to be a URL the buyer side is actually listening on.

Run:
```bash
npm run dev
```

Heads up: `.env` only loads once when the process starts. If you change a value in `.env` (rotating the Shopify token, for example), you need to restart the server — it won't pick it up on its own even though `ts-node-dev` auto-restarts on code changes.

## Exposing this server to a buyer side on a different network

```bash
ngrok http 3000
```

Use the ngrok URL as the base for whatever the buyer side calls (their BPP URI config, pointed at `<ngrok url>/api/webhook`).

## Endpoints

All routes are mounted under `/api/webhook`:

| Method | Path | Purpose |
|---|---|---|
| POST | `/discover` | Buyer side requests available offers (live Shopify catalog) |
| POST | `/select` | Buyer side selects a specific product |
| POST | `/init` | Buyer side initializes an order |
| POST | `/confirm` | Buyer side confirms an order |
| POST | `/status` | Buyer side checks order status |
| POST | `/cancel` | Buyer side cancels an order |
| POST | `/update`, `/track`, `/support`, `/rate` | Static responses |
| POST | `/trigger/on_status`, `/trigger/on_cancel`, `/trigger/on_update` | Manually push a callback |
| GET | `/api/health` | Health check |

Each POST above triggers an async `on_<action>` callback to `BPP_CALLBACK_ENDPOINT` a moment later, carrying the real response.

## Sample requests

Example request bodies for each action are in [`sample_payloads/`](sample_payloads/) — useful as a starting point for curl or Postman testing. They're written against a real product from a Shopify dev store, so they'll only resolve to live data if your store happens to have a matching product ID — otherwise they'll just hit the static fallback, which is still a valid response.

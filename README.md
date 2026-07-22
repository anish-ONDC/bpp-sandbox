# Logistics BPP — P2P Courier Delivery (Beckn v2.0.0)

A seller-side implementation (BPP — Beckn Provider Platform) for a peer-to-peer courier delivery use case, built on the [Beckn Sandbox](https://github.com/beckn/sandbox) for the [Beckn v2.0.0 protocol](https://github.com/beckn/protocol-specifications-new).

It exposes the standard Beckn lifecycle endpoints (`discover`, `select`, `init`, `confirm`, `status`, `cancel`) and responds with a courier delivery catalog, priced quote, and order confirmation for the domain `beckn.one:logistics:p2p-delivery:1.0`.

## How it works

Every Beckn action has two legs:
1. **Request** — a buyer-side app (BAP) POSTs an action (e.g. `/discover`) to this server. This server replies instantly with just an ACK.
2. **Callback** — in the background, this server loads the matching response template (e.g. the courier catalog), rebuilds the context, and POSTs it separately to the buyer side's `on_<action>` callback endpoint (e.g. `on_discover`) — that's where the real data actually lands.

```
Buyer side                          This server (Seller side / BPP)
   |-- POST /discover --------------->|
   |<----------- ACK -----------------|
   |                                  |  (loads on_discover.json,
   |                                  |   rebuilds context)
   |<---- POST on_discover -----------|
   |------------- ACK --------------->|
```

Same pattern for every action — only the JSON template loaded and the action name change. Response templates live at:
```
src/webhook/jsons/beckn.one.logistics.p2p-delivery/response/
  on_discover.json    courier catalog
  on_select.json       priced quote
  on_init.json / on_confirm.json / on_status.json / on_cancel.json
```

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
BPP_CALLBACK_ENDPOINT=<the buyer side's public URL>   # e.g. an ngrok URL
```
`BPP_CALLBACK_ENDPOINT` is where this server sends every `on_<action>` callback — it must be a URL the buyer side's server is actually listening on.

Run:
```bash
npm run dev      # local dev, auto-restarts on file changes (NOT on .env changes — restart manually after editing .env)
```

## Exposing this server to a buyer side on a different network

If the buyer side isn't on the same LAN, tunnel this server publicly with [ngrok](https://ngrok.com/):
```bash
ngrok http 3000
```
Use the resulting `https://<...>.ngrok-free.dev` URL as the base for whatever the buyer side calls (their `BPP_URI` config, pointed at `<that ngrok URL>/api/webhook`).

## Endpoints

All routes are mounted under `/api`:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhook/discover` | Buyer side requests available offers |
| POST | `/api/webhook/select` | Buyer side selects an offer |
| POST | `/api/webhook/init` | Buyer side initializes an order |
| POST | `/api/webhook/confirm` | Buyer side confirms an order |
| POST | `/api/webhook/status` | Buyer side checks order status |
| POST | `/api/webhook/cancel` | Buyer side cancels an order |
| GET | `/api/health` | Health check |

Each POST above triggers an async `on_<action>` callback to `BPP_CALLBACK_ENDPOINT` a moment later, carrying the real response data.

## Sample requests

Example request bodies for each action are in [`sample_payloads/`](sample_payloads/) — useful as a starting point for Postman or curl testing.

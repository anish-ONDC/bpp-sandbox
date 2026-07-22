# DEMO RUNBOOK — Logistics BPP
---

## 1. Start the server and confirm it's reachable

Open a terminal:
```bash
cd ~/Desktop/seller-side/bpp-sandbox
npm run dev
```

In a new terminal tab, confirm it's running locally:
```bash
curl http://localhost:3000/api/health
```
Expect: `{"message":"OK!"}`

Now expose the server publicly with ngrok, in another terminal:
```bash
ngrok http 3000
```
Wait for a line like:
```
Forwarding    https://abcd1234.ngrok-free.dev -> http://localhost:3000
```
Copy that `https://...ngrok-free.dev` address — this is your BPP's public URL for today. Leave this terminal open too.

Confirm the tunnel works by hitting the health check through it instead of localhost:
```bash
curl https://<your-ngrok-url>/api/health
```
Expect the same `{"message":"OK!"}` response. If this works, your server is reachable from outside your machine.

---

## 2. Test locally with curl 

```bash
cd ~/Desktop/seller-side/sample_payloads
curl -X POST https://<your-ngrok-url>/api/webhook/discover -H "Content-Type: application/json" -d @sample_discover.json
curl -X POST https://<your-ngrok-url>/api/webhook/select   -H "Content-Type: application/json" -d @sample_select.json
curl -X POST https://<your-ngrok-url>/api/webhook/init     -H "Content-Type: application/json" -d @sample_init.json
curl -X POST https://<your-ngrok-url>/api/webhook/confirm  -H "Content-Type: application/json" -d @sample_confirm.json
curl -X POST https://<your-ngrok-url>/api/webhook/status   -H "Content-Type: application/json" -d @sample_status.json
curl -X POST https://<your-ngrok-url>/api/webhook/cancel   -H "Content-Type: application/json" -d @sample_cancel.json
```

- Each curl command prints something like `{"message":{"status":"ACK","messageId":"msg-select-p2p-001"}}` immediately.
- In the terminal running the server, within about a second you'll see two more lines per request, e.g.:
  ```
  Triggering On Select response to: <whatever BPP_CALLBACK_ENDPOINT is set to>/on_select
  On Select api call response:  { message: { status: 'ACK', messageId: 'msg-select-p2p-001' } }
  ```
  Seeing both lines means the full request → callback loop worked.

**If curl hangs or errors:** the server isn't running, or the ngrok tunnel isn't up — go back to Section 1.

---

## 3. Connecting with the BAP

### Step A — Get their public URL
Ask the BAP side to run ngrok pointed at their own server's port and share the `Forwarding` URL it gives them, e.g.:
```bash
ngrok http 4000
```
They should send you something like `https://xyz9876.ngrok-free.dev`.

### Step B — Put their URL into YOUR `.env`

Replace it with their URL (no trailing slash):
```
BPP_CALLBACK_ENDPOINT=https://xyz9876.ngrok-free.dev
```

### Step C — Restart the server 
Confirm it says `Server is running on port 3000` again.

### Step D — Verify the change took effect
```bash
cd ~/Desktop/seller-side/sample_payloads
curl -X POST https://<your-ngrok-url>/api/webhook/discover -H "Content-Type: application/json" -d @sample_discover.json
```
Check the server terminal — the `Triggering On Discover response to:` line should now show
**their URL** (`https://xyz9876.ngrok-free.dev/on_discover`). 

### Step E — Give the BAP side what they need
Send them these:

| What | Value |
|---|---|
| Your BPP's public URL | `https://<your-ngrok-url>` |
| Domain string | `beckn.one:logistics:p2p-delivery:1.0` |
| Your `bppId` | `seller-side-logistics-bpp.example.com` |
| Endpoint paths | `/api/webhook/discover`, `/select`, `/init`, `/confirm`, `/status`, `/cancel` |

They need to:
1. Point their BAP's outbound calls at your public URL + those paths
2. Set `context.domain` to the value above on every request
3. **Build (or confirm they already have) receiving endpoints on their own BAP** for
   `on_discover`, `on_select`, `on_init`, `on_confirm`, `on_status`, `on_cancel` — without
   these they'll only ever see ACKs, never the actual quote/confirmation data

---

## 4. The actual live test sequence with the BAP

Once Section 3 is done on both sides:

1. Ask them to fire `/discover` (or their equivalent "search") from their BAP.
2. Watch your `npm run dev` terminal — you should see the incoming request logged, then
   `Triggering On Discover response to: <their URL>/on_discover`.
3. Ask them to confirm they received it on their end (whatever their BAP does when it gets an
   `on_discover` — display a catalog, log it, etc.)
4. Repeat for `/select`, `/init`, `/confirm`, `/status` — same pattern each time: they
   send, you watch your logs fire the callback, they confirm receipt.
5. Optionally demo `/cancel` too, showing the fee waiver in the response.


---

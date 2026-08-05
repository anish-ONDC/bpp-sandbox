# Live Test Guide — Real Other Machine

Steps for a genuine test: another machine sends real Beckn v2.0.0 requests to your ONIX, your backend gets v3.0.0, and your responses land back at their real webhook, downgraded to v2.0.0.

Scoped to `discover` and `status` only — those are the only two actions with published translation artifacts right now. Anything else the other machine sends (`select`, `init`, `confirm`, `cancel`) has no routing rule and no artifact, and will fail.

No signing is wired into this path (`validateSign` step is off, same as the rest of this ONIX setup) — dev/test only, not a hardened endpoint.

## 0. Clean slate — kill anything already running

```bash
lsof -iTCP -sTCP:LISTEN -P | grep -E ':(8080|9100|9200|3000|4040)'
```

Anything listed on 8080 (ONIX), 9100 (registry), 9200 (bridge), 3000 (backend), or 4040 (ngrok's local inspector) that you didn't just start yourself — `kill -9 <pid>` it. Stale processes from earlier test runs are the single most common thing that goes wrong here — the logs will look fine but you'll actually be hitting old code or old data.

## 1. Start everything, one per terminal

**Terminal 1 — Redis** (skip if already running: `redis-cli ping` should say `PONG`)
```bash
redis-server
```

**Terminal 2 — registry**
```bash
cd version-bridge/registry && npm start
```

**Terminal 3 — bridge** (this is the one with the new logging — watch this one)
```bash
cd version-bridge/bridge && node server.js
```

**Terminal 4 — your backend**, logged to both terminal and file:
```bash
cd bpp-sandbox-v2 && mkdir -p logs && npm run dev 2>&1 | tee -a logs/bpp-sandbox.log
```

**Terminal 5 — ONIX**
```bash
cd beckn-onix && go run ./cmd/adapter -config /Users/anish/Desktop/seller-side/beckn-onix/config/onix-bpp/adapter.yaml
```

Check each one actually bound its port before moving on (`lsof -iTCP -sTCP:LISTEN -P | grep <port>`).

## 2. Expose ONIX

**Terminal 6:**
```bash
ngrok http 8080
```

Copy the `https://` forwarding URL it prints (e.g. `https://abcd1234.ngrok-free.app`). Free ngrok gives you a new random URL every time you restart it — if you stop and restart ngrok mid-test, you have to send the other machine the new URL.

## 3. What to give the other machine

Two URLs, built from your ngrok URL:

- Discover: `https://abcd1234.ngrok-free.app/bpp/v2-receiver/discover`
- Status: `https://abcd1234.ngrok-free.app/bpp/v2-receiver/status`

Tell them: send real, schema-valid Beckn v2.0.0 `discover`/`status` requests here, as POST with a normal Beckn `context`/`message` body.

## 4. What to get from them

Their real webhook base URL — where they want to receive your `on_discover`/`on_status` callbacks. Just the base, e.g. `https://their-server.com/beckn/bap` — your bridge appends the action name itself.

## 5. Paste their URL in

Edit `version-bridge/registry/data/manifests/nfh.global_subscribers.beckn.one_example-bap.yaml`, change `endpointUrl:` to what they gave you. Save — no restart needed, the registry reads the file fresh on every lookup.

## 6. Watch it happen

Terminal 3 (bridge) shows every stage live: `▶ INCOMING` (their raw v2.0.0 request) → `⇄ TRANSLATED` (v3.0.0) → `→ FORWARDING` → `✓ DELIVERED`/`✘ FAILED`. Same blocks again in reverse when your backend's response goes back out to them. Everything's also written to `version-bridge/bridge/logs/bridge.log`, plain text, so it's still there after you close the terminal:

```bash
tail -f version-bridge/bridge/logs/bridge.log
```

## 7. After the test

Kill all six terminals (Ctrl+C each, or repeat the step-0 sweep) and stop ngrok.

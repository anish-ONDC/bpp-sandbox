// Logs every stage of a translate request — what came in, what it turned
// into, where it got sent, what came back. Same colored-block style as
// bpp-sandbox-v2's own logger, so both are easy to read side by side.
// Terminal gets color; logs/bridge.log gets the same content in plain text,
// so the trail survives after the terminal's closed.

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "bridge.log");
fs.mkdirSync(LOG_DIR, { recursive: true });

const color = {
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const RULE = "─".repeat(74);

function txnId(payload) {
  return payload?.context?.transaction_id || payload?.context?.transactionId || "unknown";
}

function block(label, colorCode, headline, body) {
  const bodyStr = body !== undefined ? JSON.stringify(body, null, 2) : "";

  console.log(`${colorCode}${RULE}${color.reset}`);
  console.log(`${colorCode}${color.bold}${label}   ${headline}${color.reset}`);
  console.log(`${colorCode}${RULE}${color.reset}`);
  if (bodyStr) console.log(bodyStr);
  console.log("");

  const fileLines = [RULE, `[${new Date().toISOString()}] ${label}   ${headline}`, RULE];
  if (bodyStr) fileLines.push(bodyStr);
  fileLines.push("");
  fs.appendFileSync(LOG_FILE, fileLines.join("\n") + "\n");
}

module.exports = {
  incoming(action, payload) {
    block("▶ INCOMING", color.cyan, `${action}  txn=${txnId(payload)}  v${payload?.context?.version}`, payload);
  },
  translated(action, fromVersion, toVersion, payload) {
    block("⇄ TRANSLATED", color.yellow, `${action}  v${fromVersion} → v${toVersion}  txn=${txnId(payload)}`, payload);
  },
  forwarding(action, payload, url) {
    block("→ FORWARDING", color.cyan, `${action}  txn=${txnId(payload)}  → ${url}`);
  },
  delivered(action, payload, status) {
    block("✓ DELIVERED", color.green, `${action}  txn=${txnId(payload)}  destination responded ${status}`);
  },
  failed(action, payload, reason) {
    block("✘ FAILED", color.red, `${action}  txn=${txnId(payload)}  ${reason}`);
  },
};

// Writes each result as a clear, readable block instead of one dense line
// of JSON — a header saying what happened, then the actual data, spaced
// out so it's easy to scan back through afterward.
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "logs");
const LOG_PATH = path.join(LOG_DIR, "callbacks.log");
fs.mkdirSync(LOG_DIR, { recursive: true });

const RULE = "─".repeat(74);

function writeBlock(header, body) {
  const lines = [RULE, `[${new Date().toISOString()}] ${header}`, RULE];
  if (body !== undefined) {
    lines.push(JSON.stringify(body, null, 2));
  }
  lines.push("");
  fs.appendFileSync(LOG_PATH, lines.join("\n") + "\n");
}

module.exports = {
  logMapped(action, version, valid, output) {
    const status = valid ? "VALID" : "INVALID";
    writeBlock(`${action.toUpperCase()} — ${version} — ${status}`, output);
  },
  logDelivered(action, status, response) {
    writeBlock(`${action.toUpperCase()} — DELIVERED to mock BAP webhook (status ${status})`, response);
  },
  logFailed(action, error) {
    writeBlock(`${action.toUpperCase()} — FAILED to deliver`, { error });
  },
  reset() {
    fs.writeFileSync(LOG_PATH, "");
  },
  LOG_PATH,
};

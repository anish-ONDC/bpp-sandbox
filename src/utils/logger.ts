// Small ANSI-colored console logger, purely for readability while watching
// live traffic in a terminal — has no effect on the actual request/response
// data, only on what gets printed.

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";

const divider = (color: string) => `${color}${"─".repeat(72)}${RESET}`;

export const logIncoming = (method: string, url: string, body: unknown) => {
  console.log("\n" + divider(CYAN));
  console.log(`${CYAN}${BOLD}▶ INCOMING   ${method} ${url}${RESET}`);
  console.log(divider(CYAN));
  console.log(JSON.stringify(body, null, 2));
};

export const logForwarding = (action: string, url: string) => {
  console.log(`${MAGENTA}${BOLD}→ FORWARDING${RESET} on_${action}  ${DIM}${url}${RESET}`);
};

export const logDelivered = (action: string, received: unknown) => {
  console.log(`${GREEN}${BOLD}✔ DELIVERED${RESET}  on_${action}  ${DIM}${JSON.stringify(received)}${RESET}`);
  console.log(divider(GREEN) + "\n");
};

export const logFailed = (action: string, message: string) => {
  console.log(`${RED}${BOLD}✘ FAILED${RESET}     on_${action}  ${message}`);
  console.log(divider(RED) + "\n");
};

export const logFallback = (message: string) => {
  console.log(`${YELLOW}⚠ FALLBACK${RESET}   ${message}`);
};

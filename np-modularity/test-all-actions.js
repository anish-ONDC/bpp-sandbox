// Runs every action through both mapper versions, checks each output
// against the real matching rules, sends what would actually go out today
// (the v1 / v2.0.0 shape) to a mock BAP webhook to confirm it's genuinely
// deliverable, and writes everything to logs/callbacks.log so it can be
// read back afterward instead of just scrolling past in the terminal.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mapperV1 = require("./mapper/v1");
const mapperV2 = require("./mapper/v2");
const { check } = require("./check-schema");

const PRODUCTS_PATH = path.join(__dirname, "data", "shopify-raw-products.json");
const ORDER_PATH = path.join(__dirname, "fixtures", "sample-order.json");
const BECKN2_PATH = path.join(__dirname, "schemas/beckn2.yaml");
const BECKN3_PATH = path.join(__dirname, "schemas/beckn3.yaml");
const WEBHOOK_URL = "http://localhost:4010";

const LOG_DIR = path.join(__dirname, "logs");
const LOG_PATH = path.join(LOG_DIR, "callbacks.log");
fs.mkdirSync(LOG_DIR, { recursive: true });

function logEntry(entry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n");
}

// action -> [v2.0.0 schema name, v3.0.0 schema name, v1 mapper fn, v2 mapper fn]
const ACTIONS = {
  discover: ["OnDiscoverAction", "OnDiscoverAction", (p, ctx) => mapperV1.mapDiscover(p, ctx), (p, ctx) => mapperV2.mapDiscover(p, ctx)],
  select: ["OnSelectAction", "OnSelectAction", (o, p, c) => mapperV1.mapSelect(o, p, c), (o, p, c) => mapperV2.mapSelect(o, p, c)],
  init: ["OnInitAction", "OnInitAction", (o, p, c) => mapperV1.mapInit(o, p, c), (o, p, c) => mapperV2.mapInit(o, p, c)],
  confirm: ["OnConfirmAction", "OnConfirmAction", (o, p, c) => mapperV1.mapConfirm(o, p, c), (o, p, c) => mapperV2.mapConfirm(o, p, c)],
  status: ["OnStatusAction", "OnStatusAction", (o, p, c) => mapperV1.mapStatus(o, p, c), (o, p, c) => mapperV2.mapStatus(o, p, c)],
  cancel: ["OnCancelAction", "OnCancelAction", (o, p, c) => mapperV1.mapCancel(o, p, c), (o, p, c) => mapperV2.mapCancel(o, p, c)],
};

async function fetchCurrency() {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const { data } = await axios.get(`https://${shop}.myshopify.com/admin/api/2024-10/shop.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  return data?.shop?.currency ?? "INR";
}

let allOk = true;
function result(desc, condition) {
  console.log(`  [${condition ? "PASS" : "FAIL"}] ${desc}`);
  if (!condition) allOk = false;
}

async function runAction(action, [v2SchemaName, v3SchemaName, v1Fn, v2Fn], products, order, shop, currency) {
  console.log(`\n=== ${action} ===`);

  const v1Output = action === "discover" ? v1Fn(products, { shop, currency }) : v1Fn(order, products, currency);
  const v2Output = action === "discover" ? v2Fn(products, { shop, currency }) : v2Fn(order, products, currency);

  const v1Check = check(BECKN2_PATH, v2SchemaName, v1Output);
  const v2Check = check(BECKN3_PATH, v3SchemaName, v2Output);
  result(`v1 output matches real v2.0.0 rules (${v2SchemaName})`, v1Check.valid);
  result(`v2 output matches real v3.0.0 rules (${v3SchemaName})`, v2Check.valid);

  logEntry({ action, version: "v1 (v2.0.0)", output: v1Output, validAgainstRealSchema: v1Check.valid });
  logEntry({ action, version: "v2 (v3.0.0)", output: v2Output, validAgainstRealSchema: v2Check.valid });

  try {
    const { data, status } = await axios.post(`${WEBHOOK_URL}/on_${action}`, v1Output);
    result(`v1 output actually delivered to the mock BAP webhook`, status === 200);
    logEntry({ action, delivered: true, webhookResponse: data });
  } catch (err) {
    result(`v1 output actually delivered to the mock BAP webhook`, false);
    logEntry({ action, delivered: false, error: err.message });
  }
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const order = JSON.parse(fs.readFileSync(ORDER_PATH, "utf-8"));
  const shop = process.env.SHOPIFY_SHOP;
  const currency = await fetchCurrency();

  for (const [action, spec] of Object.entries(ACTIONS)) {
    await runAction(action, spec, products, order, shop, currency);
  }

  console.log(`\n${allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  console.log(`Full log: ${LOG_PATH}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("Failed:", err.response?.status, err.response?.data ?? err.message);
  process.exit(1);
});

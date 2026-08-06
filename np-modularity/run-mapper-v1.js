// Runs Mapper v1 against the seller's real, already-fetched data, and
// checks the result against the real v2.0.0 rules. Currency is fetched
// here, in this script, not inside the mapper — the mapper itself makes no
// network calls.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { mapCatalog } = require("./mapper/v1");
const { check } = require("./check-schema");

const PRODUCTS_PATH = path.join(__dirname, "data", "shopify-raw-products.json");

async function fetchCurrency() {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const { data } = await axios.get(`https://${shop}.myshopify.com/admin/api/2024-10/shop.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  return data?.shop?.currency ?? "INR";
}

async function main() {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error(`No saved product data at ${PRODUCTS_PATH} — run fetch-shopify-data.js first.`);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const shop = process.env.SHOPIFY_SHOP;
  const currency = await fetchCurrency();

  const result = mapCatalog(products, { shop, currency });

  console.log(`Mapped ${products.length} real products into on_discover shape.`);
  console.log(`Catalog: "${result.catalogs[0].descriptor.name}", ${result.catalogs[0].resources.length} resources, ${result.catalogs[0].offers.length} offers, currency ${currency}.`);

  const { valid, errors } = check(path.join(__dirname, "schemas/beckn2.yaml"), "OnDiscoverAction", result);
  console.log(valid ? "Matches the real v2.0.0 rules." : "Does NOT match the real v2.0.0 rules:");
  if (!valid) {
    console.log(errors);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Failed:", err.response?.status, err.response?.data ?? err.message);
  process.exit(1);
});

// Phase 1: pull the seller's real data, exactly as Shopify hands it over,
// and save it untouched. This is "BAP impl" for the rest of this project —
// nothing here is Beckn-shaped, nothing here is invented.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const shop = process.env.SHOPIFY_SHOP;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

if (!shop || !token) {
  console.error("SHOPIFY_SHOP or SHOPIFY_ADMIN_API_TOKEN is missing — check .env");
  process.exit(1);
}

const OUT_PATH = path.join(__dirname, "data", "shopify-raw-products.json");

async function main() {
  const { data } = await axios.get(
    `https://${shop}.myshopify.com/admin/api/2024-10/products.json?limit=250`,
    { headers: { "X-Shopify-Access-Token": token } }
  );

  const products = data.products ?? [];
  fs.writeFileSync(OUT_PATH, JSON.stringify(products, null, 2));

  console.log(`Fetched ${products.length} products from ${shop}.myshopify.com`);
  console.log(`Saved to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("Fetch failed:", err.response?.status, err.response?.data ?? err.message);
  process.exit(1);
});

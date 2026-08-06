// Turns the seller's raw Shopify data into the shape a v2.0.0 on_discover
// response needs. No network calls in here — data in, data out, nothing
// else. The seller's own data doesn't change no matter what this function
// does internally.
const { mapProductToResourceAndOffer } = require("./shared");

function mapCatalog(products, { shop, currency }) {
  const mapped = products.map((product) => mapProductToResourceAndOffer(product, currency));

  return {
    catalogs: [
      {
        id: `catalog-shopify-${shop}`,
        descriptor: { name: `${shop} — Live Shopify Catalog` },
        bppId: "seller-side-logistics-bpp.example.com",
        isActive: true,
        provider: {
          id: `provider-${shop}`,
          descriptor: { name: shop },
        },
        resources: mapped.map((m) => m.resource),
        offers: mapped.map((m) => m.offer),
      },
    ],
  };
}

module.exports = { mapCatalog };

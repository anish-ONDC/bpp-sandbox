// Same as v1, targeting v3.0.0 instead — the only real difference is
// catalogSummary, computed from the same catalogs this function already
// built. Still no network calls, still pure: data in, data out.
const { mapProductToResourceAndOffer } = require("./shared");

function mapCatalog(products, { shop, currency }) {
  const mapped = products.map((product) => mapProductToResourceAndOffer(product, currency));

  const catalogs = [
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
  ];

  const catalogSummary = catalogs.map(
    (catalog) => `${catalog.descriptor.name}: ${catalog.resources.length} resources, ${catalog.offers.length} offers`
  );

  return { catalogs, catalogSummary };
}

module.exports = { mapCatalog };

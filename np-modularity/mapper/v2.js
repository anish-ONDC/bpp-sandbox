// Same as v1, targeting v3.0.0 instead. catalogSummary only applies to
// discover — nothing else returns a catalog. The progress rename applies
// wherever a contract actually carries performance data, whichever action
// that happens to be. Still no network calls, still pure.
const { mapProductToResourceAndOffer } = require("./shared");
const { buildContract } = require("./contract-shared");
const v1 = require("./v1");

function renameProgress(contract) {
  if (!contract.performance) {
    return contract;
  }
  const { performance, ...rest } = contract;
  return { ...rest, progress: performance };
}

function mapDiscover(products, { shop, currency }) {
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

function mapSelect(order, products, currency) {
  const { contract } = v1.mapSelect(order, products, currency);
  return { contract: renameProgress(contract) };
}

function mapInit(order, products, currency) {
  const { contract } = v1.mapInit(order, products, currency);
  return { contract: renameProgress(contract) };
}

function mapConfirm(order, products, currency) {
  const { contract } = v1.mapConfirm(order, products, currency);
  return { contract: renameProgress(contract) };
}

function mapStatus(order, products, currency) {
  const { contract } = v1.mapStatus(order, products, currency);
  return { contract: renameProgress(contract) };
}

function mapCancel(order, products, currency) {
  const { contract } = v1.mapCancel(order, products, currency);
  return { contract: renameProgress(contract) };
}

module.exports = {
  mapCatalog: mapDiscover,
  mapDiscover,
  mapSelect,
  mapInit,
  mapConfirm,
  mapStatus,
  mapCancel,
};

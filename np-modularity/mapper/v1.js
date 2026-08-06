// Turns the seller's own data into the shape a v2.0.0 response needs. No
// network calls in here — data in, data out, nothing else. The seller's
// own data doesn't change no matter what this function does internally.
const { mapProductToResourceAndOffer } = require("./shared");
const { buildContract } = require("./contract-shared");

function findProduct(products, productId) {
  const product = products.find((p) => String(p.id) === String(productId));
  if (!product) {
    throw new Error(`No product with id ${productId} in the seller's data`);
  }
  return product;
}

function mapDiscover(products, { shop, currency }) {
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

function mapSelect(order, products, currency) {
  const product = findProduct(products, order.productId);
  const contract = buildContract(order, product, currency, {
    contractStatus: { code: "DRAFT", name: "Quote generated, awaiting init" },
    commitmentStatusCode: "DRAFT",
    considerationStatus: "QUOTED",
  });
  return { contract };
}

function mapInit(order, products, currency) {
  const product = findProduct(products, order.productId);
  const contract = buildContract(order, product, currency, {
    contractStatus: { code: "DRAFT", name: "Final terms ready, awaiting confirm" },
    commitmentStatusCode: "DRAFT",
    considerationStatus: "FINALIZED",
    settlementStatus: "NOT_PAID",
    includeBuyer: true,
  });
  return { contract };
}

function mapConfirm(order, products, currency) {
  const product = findProduct(products, order.productId);
  const contract = buildContract(order, product, currency, {
    contractStatus: { code: "ACTIVE", name: "Order confirmed" },
    commitmentStatusCode: "ACTIVE",
    considerationStatus: "CONFIRMED",
    settlementStatus: "PAID",
    performanceStatus: "CONFIRMED",
    includeBuyer: true,
  });
  return { contract };
}

function mapStatus(order, products, currency) {
  const product = findProduct(products, order.productId);
  const contract = buildContract(order, product, currency, {
    contractStatus: { code: "ACTIVE", name: "Order processing" },
    commitmentStatusCode: "ACTIVE",
    considerationStatus: "CONFIRMED",
    settlementStatus: "PAID",
    performanceStatus: "IN_PROGRESS",
    includeBuyer: true,
  });
  return { contract };
}

function mapCancel(order, products, currency) {
  const product = findProduct(products, order.productId);
  const contract = buildContract(order, product, currency, {
    contractStatus: { code: "CANCELLED", name: "Cancelled by buyer" },
    commitmentStatusCode: "CLOSED",
    considerationStatus: "CANCELLED",
    settlementStatus: "REFUNDED",
    includeBuyer: true,
  });
  return { contract };
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

// Builds a Contract from the seller's own order record plus one product.
// Shared by select/init/confirm/status/cancel — each action just calls
// this with different status values, same as the real backend does.
// Produces the base (v2.0.0) shape, using "performance" as the field name —
// v2's mapper renames it to "progress" afterward, this function doesn't
// know or care which version it's feeding.
const { mapProductToResourceAndOffer } = require("./shared");

// Same mapping the real backend uses (settlementAttributes.status -> the
// outer Settlement.status enum: DRAFT | COMMITTED | COMPLETE).
const SETTLEMENT_STATUS_MAP = {
  NOT_PAID: "DRAFT",
  PENDING: "COMMITTED",
  PARTIALLY_PAID: "COMMITTED",
  PAID: "COMPLETE",
  REFUNDED: "COMPLETE",
  FAILED: "DRAFT",
};

function buildContract(order, product, currency, options) {
  const { resource, offer } = mapProductToResourceAndOffer(product, currency);
  const { transactionId, contractId, quantity, buyer } = order;
  const price = Number(product.variants?.[0]?.price ?? 0) * quantity;

  const contract = {
    id: contractId,
    status: options.contractStatus,
    commitments: [
      {
        id: `commitment-${transactionId}`,
        status: { descriptor: { code: options.commitmentStatusCode } },
        resources: [{ id: resource.id, quantity: { count: quantity } }],
        offer: { id: offer.id, resourceIds: [resource.id] },
      },
    ],
    consideration: [
      {
        id: `consideration-${transactionId}`,
        status: { code: options.considerationStatus },
        considerationAttributes: {
          "@context": "https://schema.org",
          "@type": "PriceSpecification",
          priceCurrency: currency,
          price,
        },
      },
    ],
    participants: [
      {
        id: "provider-1",
        descriptor: { name: "Seller", code: "PROVIDER" },
      },
      ...(options.includeBuyer ? [{ id: "buyer-1", descriptor: { name: buyer.name, code: "BUYER" } }] : []),
    ],
  };

  if (options.settlementStatus) {
    contract.settlements = [
      {
        id: `settlement-${transactionId}`,
        considerationId: `consideration-${transactionId}`,
        status: SETTLEMENT_STATUS_MAP[options.settlementStatus] ?? "DRAFT",
        settlementAttributes: {
          "@context": "https://schema.beckn.io",
          "@type": "PaymentTerm",
          type: "POST_FULFILLMENT",
          method: order.paymentMethod,
          amount: { currency, value: price },
          status: options.settlementStatus,
        },
      },
    ];
  }

  if (options.performanceStatus) {
    contract.performance = [
      {
        id: `performance-${transactionId}`,
        status: { code: options.performanceStatus },
        commitmentIds: [`commitment-${transactionId}`],
      },
    ];
  }

  return contract;
}

module.exports = { buildContract };

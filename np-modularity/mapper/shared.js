// The part of the mapping that hasn't changed between v2.0.0 and v3.0.0 —
// turning one raw Shopify product into a Resource/Offer pair. Both mapper
// versions use this as-is.

function stripHtml(html) {
  if (!html) {
    return undefined;
  }
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || undefined;
}

function mapProductToResourceAndOffer(product, currency) {
  const resource = {
    id: `resource-shopify-${product.id}`,
    descriptor: {
      name: product.title,
      longDesc: stripHtml(product.body_html),
      thumbnailImage: product.images?.[0]?.src,
    },
    resourceAttributes: {
      "@context": "https://schema.org",
      "@type": "Product",
      brand: product.vendor || undefined,
      category: product.product_type || undefined,
      sku: product.variants?.[0]?.sku || undefined,
    },
  };

  const price = Number(product.variants?.[0]?.price ?? 0);
  const offer = {
    id: `offer-shopify-${product.id}`,
    descriptor: { name: product.title },
    resourceIds: [resource.id],
    considerations: [
      {
        id: `consideration-shopify-${product.id}`,
        considerationAttributes: {
          "@context": "https://schema.org",
          "@type": "PriceSpecification",
          priceCurrency: currency,
          price,
        },
      },
    ],
  };

  return { resource, offer };
}

module.exports = { mapProductToResourceAndOffer };

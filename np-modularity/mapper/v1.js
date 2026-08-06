// Turns the seller's raw Shopify data into the shape a v2.0.0 on_discover
// response needs. No network calls in here — data in, data out, nothing
// else. The seller's own data doesn't change no matter what this function
// does internally.

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

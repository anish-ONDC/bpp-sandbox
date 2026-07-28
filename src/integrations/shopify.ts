import axios from "axios";

interface ShopifyVariant {
  price: string;
  sku: string | null;
  inventory_quantity: number | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  images: Array<{ src: string }>;
  variants: ShopifyVariant[];
}

const stripHtml = (html: string | null): string | undefined => {
  if (!html) {
    return undefined;
  }
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || undefined;
};

const requireShopifyConfig = () => {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!shop || !token) {
    throw new Error("SHOPIFY_SHOP or SHOPIFY_ADMIN_API_TOKEN is not configured");
  }
  return { shop, token };
};

const fetchShopifyProducts = async (): Promise<ShopifyProduct[]> => {
  const { shop, token } = requireShopifyConfig();
  const { data } = await axios.get(
    `https://${shop}.myshopify.com/admin/api/2024-10/products.json?limit=20`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  return data.products ?? [];
};

const fetchShopifyProductByIdRaw = async (productId: string): Promise<ShopifyProduct | undefined> => {
  const { shop, token } = requireShopifyConfig();
  const { data } = await axios.get(
    `https://${shop}.myshopify.com/admin/api/2024-10/products/${productId}.json`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  return data?.product;
};

const fetchShopifyCurrency = async (): Promise<string> => {
  const { shop, token } = requireShopifyConfig();
  const { data } = await axios.get(
    `https://${shop}.myshopify.com/admin/api/2024-10/shop.json`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  return data?.shop?.currency ?? "INR";
};

/**
 * Maps one Shopify product into its Beckn v2.0.0 Resource + Offer pair.
 * Shared by both the full-catalog discover path and the single-product
 * select path, so both stay in sync automatically.
 */
const mapProductToResourceAndOffer = (p: ShopifyProduct, currency: string) => {
  const resource = {
    id: `resource-shopify-${p.id}`,
    descriptor: {
      name: p.title,
      longDesc: stripHtml(p.body_html),
      thumbnailImage: p.images?.[0]?.src,
    },
    resourceAttributes: {
      "@context": "https://schema.org",
      "@type": "Product",
      brand: p.vendor || undefined,
      category: p.product_type || undefined,
      sku: p.variants?.[0]?.sku || undefined,
    },
  };

  const price = Number(p.variants?.[0]?.price ?? 0);
  const offer = {
    id: `offer-shopify-${p.id}`,
    descriptor: { name: p.title },
    resourceIds: [resource.id],
    considerations: [
      {
        id: `consideration-shopify-${p.id}`,
        considerationAttributes: {
          "@context": "https://schema.org",
          "@type": "PriceSpecification",
          priceCurrency: currency,
          price,
        },
      },
    ],
  };

  return { resource, offer, price };
};

export const fetchShopifyCatalog = async (): Promise<Record<string, unknown>> => {
  const shop = process.env.SHOPIFY_SHOP as string;
  const [products, currency] = await Promise.all([fetchShopifyProducts(), fetchShopifyCurrency()]);

  const mapped = products.map((p) => mapProductToResourceAndOffer(p, currency));

  return {
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
  };
};

/**
 * Extracts the raw Shopify product ID from a Beckn resource/offer ID this
 * BPP generated (e.g. "offer-shopify-9646853652711" -> "9646853652711").
 * Returns undefined if the ID isn't one of ours.
 */
export const parseShopifyProductId = (beckneId: string | undefined): string | undefined => {
  if (!beckneId) {
    return undefined;
  }
  const match = beckneId.match(/^(?:offer|resource)-shopify-(\d+)$/);
  return match?.[1];
};

/**
 * Fetches one specific Shopify product and returns it already mapped into
 * its Resource/Offer pair, plus the resolved numeric price — used by
 * /select to quote against exactly what the caller picked.
 */
export const fetchShopifyOfferById = async (
  productId: string
): Promise<
  { resource: Record<string, unknown>; offer: Record<string, unknown>; price: number; currency: string } | undefined
> => {
  const [product, currency] = await Promise.all([fetchShopifyProductByIdRaw(productId), fetchShopifyCurrency()]);
  if (!product) {
    return undefined;
  }
  return { ...mapProductToResourceAndOffer(product, currency), currency };
};

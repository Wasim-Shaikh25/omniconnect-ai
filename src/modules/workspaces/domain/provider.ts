/** Supported eCommerce providers. Mirrors the Prisma `EcommerceProvider` enum. */
export const ECOMMERCE_PROVIDERS = [
  "SHOPIFY",
  "MAGENTO",
  "WIX",
  "CUSTOM",
] as const;

export type EcommerceProvider = (typeof ECOMMERCE_PROVIDERS)[number];

export function isEcommerceProvider(v: unknown): v is EcommerceProvider {
  return (
    typeof v === "string" &&
    (ECOMMERCE_PROVIDERS as readonly string[]).includes(v)
  );
}

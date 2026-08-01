/**
 * Provider-agnostic eCommerce connector contract.
 *
 * Every provider (Shopify, WooCommerce, ...) implements `EcommerceConnector`.
 * Callers depend on this interface only — never a concrete provider — so new
 * providers can be added by implementing the interface and registering it.
 *
 * Pure domain: no Prisma, no fetch, no env access here.
 */

export interface ConnectorCredentials {
  /** Store/shop domain, e.g. "my-shop.myshopify.com" or base URL for WooCommerce/Magento. */
  shopDomain?: string;
  /** Admin API access token for the store (API key, bearer token, or BigCommerce token). */
  accessToken?: string;
  /** Optional refresh token for OAuth-based providers. */
  refreshToken?: string;
  /** Provider-specific extras: consumerKey/consumerSecret for WooCommerce, storeHash for BigCommerce. */
  metadata?: Record<string, string | undefined>;
}

export interface StoreInfo {
  name: string;
  domain: string | null;
  currency: string | null;
  provider: string;
}

export interface ConnectorProduct {
  externalId: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  inventory: number | null;
  imageUrl: string | null;
}

export interface ConnectorOrder {
  externalId: string;
  total: number;
  currency: string | null;
  createdAt: Date;
  customerRef: string | null;
  customerEmail: string | null;
  couponCode: string | null;
  cartToken?: string | null;
  lineItems?: { externalId: string; title: string; quantity: number; price: number }[];
}

export interface ConnectorCustomer {
  externalId: string;
  name: string | null;
  email: string | null;
}

export interface ConnectorDiscount {
  code: string;
  discountPct: number;
  status: string;
}

export interface ConnectorCoupon {
  code: string;
  discountPct: number;
  expiresAt: Date | null;
}

export interface GenerateCouponInput {
  code: string;
  discountPct: number;
  expiresAt?: Date | null;
}

export interface EcommerceConnector {
  readonly provider: string;

  fetchStoreInfo(): Promise<StoreInfo>;
  getProducts(limit?: number): Promise<ConnectorProduct[]>;
  getOrders(limit?: number): Promise<ConnectorOrder[]>;
  getCustomers(limit?: number): Promise<ConnectorCustomer[]>;
  fetchDiscounts(): Promise<ConnectorDiscount[]>;
  generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon>;
  disableCoupon(code: string): Promise<void>;
}

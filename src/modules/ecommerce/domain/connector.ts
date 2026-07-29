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
  /** Store/shop domain, e.g. "my-shop.myshopify.com". */
  shopDomain?: string;
  /** Admin API access token for the store. */
  accessToken?: string;
  /** Optional refresh token for OAuth-based providers. */
  refreshToken?: string;
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

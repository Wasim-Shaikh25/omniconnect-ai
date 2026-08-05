import type { EcommerceProvider } from "@/modules/organizations";
import type {
  ConnectorOrder,
  ConnectorProduct,
  EcommerceConnector,
} from "../domain/connector";

/** One active eCommerce connection per store. */
export interface IntegrationRecord {
  id: string;
  storeId: string;
  provider: string;
  shopDomain: string | null;
  scopes: string | null;
  connectedAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface IntegrationRepository {
  upsertEcommerce(input: {
    storeId: string;
    provider: EcommerceProvider;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken?: string | null;
    scopes: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<IntegrationRecord>;

  findEcommerceByStore(storeId: string): Promise<IntegrationRecord | null>;

  /** Resolve the store that owns a given e-commerce shop domain. */
  findByShopDomain(shopDomain: string): Promise<IntegrationRecord | null>;

  /** Tokens are only read by the infrastructure layer to build a connector. */
  findCredentialsByStore(storeId: string): Promise<{
    provider: string;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    metadata: Record<string, unknown> | null;
  } | null>;
}

export interface ProductRecord {
  id: string;
  externalId: string;
  storeId: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  inventory: number | null;
  imageUrl: string | null;
  deletedAt: Date | null;
}

export interface ProductRepository {
  upsertMany(
    storeId: string,
    products: ConnectorProduct[],
  ): Promise<number>;

  /**
   * Atomically upsert the provided products and soft-delete any existing products
   * for the store whose `externalId` is not in the batch. Returns the number of
   * products upserted and removed.
   */
  sync(
    storeId: string,
    products: ConnectorProduct[],
  ): Promise<{ upserted: number; removed: number }>;

  update(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      price?: number | null;
      currency?: string | null;
      inventory?: number | null;
      imageUrl?: string | null;
    },
  ): Promise<ProductRecord | null>;

  findById(id: string): Promise<ProductRecord | null>;

  findByExternalId(storeId: string, externalId: string): Promise<ProductRecord | null>;

  listByStore(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      includeDeleted?: boolean;
    },
  ): Promise<ProductRecord[]>;
  countByStore(storeId: string, search?: string): Promise<number>;

  delete(id: string): Promise<ProductRecord | null>;

  /**
   * Soft-delete products for a store whose `externalId` is not in the provided set.
   * Typically called after a sync to remove products no longer returned by the provider.
   */
  markDeletedNotInBatch(
    storeId: string,
    externalIds: string[],
    deletedAt: Date,
  ): Promise<number>;
}

export interface CouponRecord {
  id: string;
  code: string;
  storeId: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
  deletedAt: Date | null;
  usageCount: number;
  revenueAttributed: number | null;
  lastUsedAt: Date | null;
}

export interface CouponRepository {
  create(input: {
    storeId: string;
    code: string;
    discountPct: number;
    expiresAt: Date | null;
    customerId: string | null;
  }): Promise<CouponRecord>;

  findById(id: string): Promise<CouponRecord | null>;

  update(
    id: string,
    input: {
      discountPct?: number;
      status?: string;
      expiresAt?: Date | null;
      usageCount?: number;
      revenueAttributed?: number | null;
      lastUsedAt?: Date | null;
    },
  ): Promise<CouponRecord | null>;

  disable(storeId: string, code: string): Promise<void>;

  /** Soft-delete a coupon. */
  delete(id: string): Promise<CouponRecord | null>;

  listByStore(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      includeDeleted?: boolean;
    },
  ): Promise<CouponRecord[]>;
  countByStore(storeId: string, search?: string): Promise<number>;
}

export interface OrderRecord {
  id: string;
  externalId: string;
  storeId: string;
  total: number | null;
  currency: string | null;
  orderDate: Date;
  couponCode: string | null;
  customerRef: string | null;
  customerEmail: string | null;
  attributedMediaId: string | null;
  attributionSource: string | null;
  isFirstTimeCustomer: boolean;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRepository {
  sync(storeId: string, orders: ConnectorOrder[]): Promise<{ upserted: number; removed: number }>;
  upsertMany(storeId: string, orders: ConnectorOrder[]): Promise<number>;
  listByStore(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
      since?: Date;
      couponCode?: string;
      attributedMediaId?: string;
      includeFirstTimeOnly?: boolean;
    },
  ): Promise<OrderRecord[]>;
  countByStore(storeId: string): Promise<number>;
  findByExternalId(storeId: string, externalId: string): Promise<OrderRecord | null>;
}

export interface CartRecord {
  id: string;
  storeId: string;
  cartToken: string;
  email: string | null;
  lineItemTitles: string[];
  totalPrice: number | null;
  currency: string | null;
  recoveredUrl: string | null;
  lastActivityAt: Date;
  notifiedAt: Date | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartRepository {
  upsert(input: {
    storeId: string;
    cartToken: string;
    email?: string | null;
    lineItemTitles?: string[];
    totalPrice?: number | null;
    currency?: string | null;
    recoveredUrl?: string | null;
    lastActivityAt: Date;
  }): Promise<CartRecord>;

  findByStoreAndToken(
    storeId: string,
    cartToken: string,
  ): Promise<CartRecord | null>;

  markConverted(storeId: string, cartToken: string): Promise<void>;

  /**
   * Marks a cart as notified, but only if it has not already been notified.
   * Returns true when the row was updated by this call (caller should publish),
   * and false when another process already marked it (caller should skip publishing).
   */
  markNotified(id: string): Promise<boolean>;

  findAbandoned(
    thresholdMinutes: number,
    limit?: number,
  ): Promise<CartRecord[]>;
}

/** Resolves the correct provider connector for a store. */
export interface ConnectorFactory {
  forStore(storeId: string): Promise<EcommerceConnector>;
}

import type { EcommerceProvider } from "@/modules/workspaces";
import type {
  ConnectorOrder,
  ConnectorProduct,
  EcommerceConnector,
} from "../domain/connector";
import type { AdapterConfigMapping } from "../domain/adapter-config";

/** One active eCommerce connection per store. */
export interface IntegrationRecord {
  id: string;
  projectId: string;
  provider: string;
  shopDomain: string | null;
  scopes: string | null;
  connectedAt: Date;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  lastSyncAt: Date | null;
}

export interface IntegrationRepository {
  upsertEcommerce(input: {
    projectId: string;
    provider: EcommerceProvider;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken?: string | null;
    scopes: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<IntegrationRecord>;

  findEcommerceByStore(projectId: string): Promise<IntegrationRecord | null>;

  /** Resolve the store that owns a given e-commerce shop domain. */
  findByShopDomain(shopDomain: string): Promise<IntegrationRecord | null>;

  /** Tokens are only read by the infrastructure layer to build a connector. */
  findCredentialsByStore(projectId: string): Promise<{
    provider: string;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    metadata: Record<string, unknown> | null;
  } | null>;

  /** List all adapter connections, optionally filtered by provider or status. */
  findAll(options?: { provider?: string; isActive?: boolean; limit?: number; offset?: number }): Promise<{ items: IntegrationRecord[]; total: number }>;

  findById(id: string): Promise<IntegrationRecord | null>;

  /** Approve or flag an adapter for review. */
  updateStatus(id: string, isActive: boolean): Promise<IntegrationRecord | null>;
}

export interface ProductRecord {
  id: string;
  externalId: string;
  projectId: string;
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
    projectId: string,
    products: ConnectorProduct[],
  ): Promise<number>;

  /**
   * Atomically upsert the provided products and soft-delete any existing products
   * for the store whose `externalId` is not in the batch. Returns the number of
   * products upserted and removed.
   */
  sync(
    projectId: string,
    products: ConnectorProduct[],
  ): Promise<{ upserted: number; removed: number }>;

  findByExternalId(projectId: string, externalId: string): Promise<ProductRecord | null>;

  listByStore(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      includeDeleted?: boolean;
    },
  ): Promise<ProductRecord[]>;
  countByStore(projectId: string, search?: string): Promise<number>;

  /**
   * Soft-delete a product by id. Used by Shopify webhooks; not exposed as an end-user action.
   */
  delete(id: string): Promise<ProductRecord | null>;
}

export interface CouponRecord {
  id: string;
  code: string;
  projectId: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
  deletedAt: Date | null;
  usageCount: number;
  revenueAttributed: number | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponRepository {
  create(input: {
    projectId: string;
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

  disable(projectId: string, code: string): Promise<void>;

  /** Find a live coupon by its code within a project. */
  findByCode(projectId: string, code: string): Promise<CouponRecord | null>;

  /** Atomically increment usage count and attributed revenue for a coupon. */
  incrementRedemption(projectId: string, code: string, revenue: number): Promise<CouponRecord | null>;

  /** Soft-delete a coupon. */
  delete(id: string): Promise<CouponRecord | null>;

  listByStore(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      includeDeleted?: boolean;
    },
  ): Promise<CouponRecord[]>;
  countByStore(projectId: string, search?: string): Promise<number>;
}

export interface OrderRecord {
  id: string;
  externalId: string;
  projectId: string;
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
  sync(projectId: string, orders: ConnectorOrder[]): Promise<{ upserted: number; removed: number }>;
  upsertMany(projectId: string, orders: ConnectorOrder[]): Promise<number>;
  listByStore(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      since?: Date;
      couponCode?: string;
      attributedMediaId?: string;
      includeFirstTimeOnly?: boolean;
    },
  ): Promise<OrderRecord[]>;
  countByStore(projectId: string): Promise<number>;
  findByExternalId(projectId: string, externalId: string): Promise<OrderRecord | null>;
}

export interface CartRecord {
  id: string;
  projectId: string;
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
    projectId: string;
    cartToken: string;
    email?: string | null;
    lineItemTitles?: string[];
    totalPrice?: number | null;
    currency?: string | null;
    recoveredUrl?: string | null;
    lastActivityAt: Date;
  }): Promise<CartRecord>;

  findByStoreAndToken(
    projectId: string,
    cartToken: string,
  ): Promise<CartRecord | null>;

  markConverted(projectId: string, cartToken: string): Promise<void>;

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
  forStore(projectId: string): Promise<EcommerceConnector>;
}

/** Builds a live connector from a generated adapter config and credentials. */
export interface DynamicConnectorFactory {
  build(
    config: AdapterConfigMapping,
    credentials: Record<string, string>,
  ): EcommerceConnector;
}

/** Generates an {@link AdapterConfigMapping} from API documentation text. */
export interface AdapterConfigGenerator {
  generate(input: {
    platformName: string;
    apiDocs: string;
    userId: string;
    projectId?: string | null;
  }): Promise<AdapterConfigMapping>;
}

export interface GeneratedAdapterRecord {
  id: string;
  projectId: string;
  platformName: string;
  config: AdapterConfigMapping;
  credentials: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedAdapterRepository {
  upsert(input: {
    projectId: string;
    platformName: string;
    config: AdapterConfigMapping;
    credentials: Record<string, string>;
  }): Promise<GeneratedAdapterRecord>;

  findByProject(projectId: string): Promise<GeneratedAdapterRecord | null>;

  delete(projectId: string): Promise<void>;
}

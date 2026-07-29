import type { EcommerceProvider } from "@/modules/organizations";
import type {
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
}

export interface IntegrationRepository {
  upsertEcommerce(input: {
    storeId: string;
    provider: EcommerceProvider;
    shopDomain: string | null;
    accessToken: string | null;
    scopes: string | null;
  }): Promise<IntegrationRecord>;

  findEcommerceByStore(storeId: string): Promise<IntegrationRecord | null>;

  /** Access token is only read by the infrastructure layer to build a connector. */
  findCredentialsByStore(storeId: string): Promise<{
    provider: string;
    shopDomain: string | null;
    accessToken: string | null;
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

/** Resolves the correct provider connector for a store. */
export interface ConnectorFactory {
  forStore(storeId: string): Promise<EcommerceConnector>;
}

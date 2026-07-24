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
  title: string;
  price: number | null;
  currency: string | null;
  inventory: number | null;
  imageUrl: string | null;
}

export interface ProductRepository {
  upsertMany(
    storeId: string,
    products: ConnectorProduct[],
  ): Promise<number>;

  listByStore(storeId: string, limit?: number): Promise<ProductRecord[]>;
  countByStore(storeId: string): Promise<number>;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
}

export interface CouponRepository {
  create(input: {
    storeId: string;
    code: string;
    discountPct: number;
    expiresAt: Date | null;
    customerId: string | null;
  }): Promise<CouponRecord>;

  disable(storeId: string, code: string): Promise<void>;
  listByStore(storeId: string, limit?: number): Promise<CouponRecord[]>;
}

/** Resolves the correct provider connector for a store. */
export interface ConnectorFactory {
  forStore(storeId: string): Promise<EcommerceConnector>;
}

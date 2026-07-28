import type {
  ConnectorFactory,
  CouponRecord,
  CouponRepository,
  IntegrationRecord,
  IntegrationRepository,
  ProductRecord,
  ProductRepository,
} from "./ports";
import type { ConnectorOrder } from "../domain/connector";

export interface StoreConnectionView {
  connected: boolean;
  integration: IntegrationRecord | null;
  productCount: number;
}

export function makeEcommerceQueries(deps: {
  integrations: IntegrationRepository;
  products: ProductRepository;
  coupons: CouponRepository;
  connectors: ConnectorFactory;
}) {
  return {
    async getStoreConnection(storeId: string): Promise<StoreConnectionView> {
      const [integration, productCount] = await Promise.all([
        deps.integrations.findEcommerceByStore(storeId),
        deps.products.countByStore(storeId),
      ]);
      return { connected: !!integration, integration, productCount };
    },

    async listProducts(
      storeId: string,
      limit = 50,
    ): Promise<ProductRecord[]> {
      return deps.products.listByStore(storeId, limit);
    },

    countProducts(storeId: string): Promise<number> {
      return deps.products.countByStore(storeId);
    },

    async listCoupons(storeId: string, limit = 50): Promise<CouponRecord[]> {
      return deps.coupons.listByStore(storeId, limit);
    },

    countCoupons(storeId: string): Promise<number> {
      return deps.coupons.countByStore(storeId);
    },

    async listOrders(
      storeId: string,
      limit = 50,
    ): Promise<ConnectorOrder[]> {
      const connector = await deps.connectors.forStore(storeId);
      return connector.getOrders(limit);
    },
  };
}

export type EcommerceQueries = ReturnType<typeof makeEcommerceQueries>;

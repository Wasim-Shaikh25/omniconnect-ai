import type {
  CouponRecord,
  CouponRepository,
  IntegrationRecord,
  IntegrationRepository,
  ProductRecord,
  ProductRepository,
} from "./ports";

export interface StoreConnectionView {
  connected: boolean;
  integration: IntegrationRecord | null;
  productCount: number;
}

export function makeEcommerceQueries(deps: {
  integrations: IntegrationRepository;
  products: ProductRepository;
  coupons: CouponRepository;
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

    async listCoupons(storeId: string, limit = 50): Promise<CouponRecord[]> {
      return deps.coupons.listByStore(storeId, limit);
    },
  };
}

export type EcommerceQueries = ReturnType<typeof makeEcommerceQueries>;

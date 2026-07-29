import type {
  ConnectorFactory,
  CouponRecord,
  CouponRepository,
  IntegrationRecord,
  IntegrationRepository,
  OrderRecord,
  OrderRepository,
  ProductRecord,
  ProductRepository,
} from "./ports";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";

export interface StoreConnectionView {
  connected: boolean;
  integration: IntegrationRecord | null;
  productCount: number;
  orderCount: number;
}

export function makeEcommerceQueries(deps: {
  integrations: IntegrationRepository;
  products: ProductRepository;
  coupons: CouponRepository;
  orders: OrderRepository;
  connectors: ConnectorFactory;
}) {
  return {
    async getStoreConnection(storeId: string): Promise<StoreConnectionView> {
      const [integration, productCount, orderCount] = await Promise.all([
        deps.integrations.findEcommerceByStore(storeId),
        deps.products.countByStore(storeId),
        deps.orders.countByStore(storeId),
      ]);
      return { connected: !!integration, integration, productCount, orderCount };
    },

    async listProducts(
      storeId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = 50,
    ): Promise<ProductRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.products.listByStore(storeId, options);
    },

    async listProductsPaginated(
      storeId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<ProductRecord>> {
      const [items, total] = await Promise.all([
        deps.products.listByStore(storeId, { ...pagination, offset: toSkip(pagination), search }),
        deps.products.countByStore(storeId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },

    countProducts(storeId: string, search?: string): Promise<number> {
      return deps.products.countByStore(storeId, search);
    },

    async listCoupons(
      storeId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = 50,
    ): Promise<CouponRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.coupons.listByStore(storeId, options);
    },

    async listCouponsPaginated(
      storeId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<CouponRecord>> {
      const [items, total] = await Promise.all([
        deps.coupons.listByStore(storeId, { ...pagination, offset: toSkip(pagination), search }),
        deps.coupons.countByStore(storeId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },

    countCoupons(storeId: string, search?: string): Promise<number> {
      return deps.coupons.countByStore(storeId, search);
    },

    async listOrders(
      storeId: string,
      limit = 50,
      since?: Date,
    ): Promise<OrderRecord[]> {
      return deps.orders.listByStore(storeId, { limit, since });
    },

    async listOrdersPaginated(
      storeId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<OrderRecord>> {
      const all = await deps.orders.listByStore(storeId, { since: new Date(0) });
      const q = search?.toLowerCase() ?? "";
      const filtered = q
        ? all.filter((o) =>
            `${o.externalId} ${o.customerRef ?? ""} ${o.currency ?? ""} ${o.couponCode ?? ""}`.toLowerCase().includes(q)
          )
        : all;
      const skip = toSkip(pagination);
      const items = filtered.slice(skip, skip + pagination.limit);
      return paginatedResult(items, filtered.length, pagination);
    },
  };
}

export type EcommerceQueries = ReturnType<typeof makeEcommerceQueries>;

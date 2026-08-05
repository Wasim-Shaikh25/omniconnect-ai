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
    async getStoreConnection(projectId: string): Promise<StoreConnectionView> {
      const [integration, productCount, orderCount] = await Promise.all([
        deps.integrations.findEcommerceByStore(projectId),
        deps.products.countByStore(projectId),
        deps.orders.countByStore(projectId),
      ]);
      return { connected: !!integration, integration, productCount, orderCount };
    },

    async listProducts(
      projectId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = 50,
    ): Promise<ProductRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.products.listByStore(projectId, options);
    },

    async listProductsPaginated(
      projectId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<ProductRecord>> {
      const [items, total] = await Promise.all([
        deps.products.listByStore(projectId, { ...pagination, offset: toSkip(pagination), search }),
        deps.products.countByStore(projectId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },

    countProducts(projectId: string, search?: string): Promise<number> {
      return deps.products.countByStore(projectId, search);
    },

    async listCoupons(
      projectId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = 50,
    ): Promise<CouponRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.coupons.listByStore(projectId, options);
    },

    async listCouponsPaginated(
      projectId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<CouponRecord>> {
      const [items, total] = await Promise.all([
        deps.coupons.listByStore(projectId, { ...pagination, offset: toSkip(pagination), search }),
        deps.coupons.countByStore(projectId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },

    countCoupons(projectId: string, search?: string): Promise<number> {
      return deps.coupons.countByStore(projectId, search);
    },

    async listOrders(
      projectId: string,
      limit = 50,
      since?: Date,
    ): Promise<OrderRecord[]> {
      return deps.orders.listByStore(projectId, { limit, since });
    },

    async listOrdersPaginated(
      projectId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<OrderRecord>> {
      const all = await deps.orders.listByStore(projectId, { since: new Date(0) });
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

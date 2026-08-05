import type {
  CustomerProfile,
  CustomerRecord,
  CustomerRepository,
  FollowerRecord,
  FollowerRepository,
} from "./ports";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";

export function makeCrmQueries(deps: {
  customers: CustomerRepository;
  followers: FollowerRepository;
}) {
  return {
    listCustomers(storeId: string, limit = 50): Promise<CustomerRecord[]> {
      return deps.customers.listByStore(storeId, limit);
    },
    listFollowers(
      storeId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string } = 50,
    ): Promise<FollowerRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.followers.listByStore(storeId, options);
    },
    async listFollowersPaginated(
      storeId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<FollowerRecord>> {
      const [items, total] = await Promise.all([
        deps.followers.listByStore(storeId, { ...pagination, offset: toSkip(pagination), search }),
        deps.followers.countByStore(storeId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },
    countFollowers(storeId: string, search?: string): Promise<number> {
      return deps.followers.countByStore(storeId, search);
    },
    getCustomerProfile(input: {
      storeId: string;
      externalUserId: string;
      channel: "INSTAGRAM" | "FACEBOOK";
    }): Promise<CustomerProfile | null> {
      return deps.customers.getProfile(input);
    },
  };
}

export type CrmQueries = ReturnType<typeof makeCrmQueries>;

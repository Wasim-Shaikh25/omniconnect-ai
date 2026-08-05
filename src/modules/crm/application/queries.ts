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
    listCustomers(projectId: string, limit = 50): Promise<CustomerRecord[]> {
      return deps.customers.listByStore(projectId, limit);
    },
    listFollowers(
      projectId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string } = 50,
    ): Promise<FollowerRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.followers.listByStore(projectId, options);
    },
    async listFollowersPaginated(
      projectId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<FollowerRecord>> {
      const [items, total] = await Promise.all([
        deps.followers.listByStore(projectId, { ...pagination, offset: toSkip(pagination), search }),
        deps.followers.countByStore(projectId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },
    countFollowers(projectId: string, search?: string): Promise<number> {
      return deps.followers.countByStore(projectId, search);
    },
    getCustomerProfile(input: {
      projectId: string;
      externalUserId: string;
      channel: "INSTAGRAM" | "FACEBOOK";
    }): Promise<CustomerProfile | null> {
      return deps.customers.getProfile(input);
    },
  };
}

export type CrmQueries = ReturnType<typeof makeCrmQueries>;

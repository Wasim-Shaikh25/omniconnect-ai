import type {
  CustomerRecord,
  CustomerRepository,
  FollowerRecord,
  FollowerRepository,
} from "./ports";

export function makeCrmQueries(deps: {
  customers: CustomerRepository;
  followers: FollowerRepository;
}) {
  return {
    listCustomers(storeId: string, limit = 50): Promise<CustomerRecord[]> {
      return deps.customers.listByStore(storeId, limit);
    },
    listFollowers(storeId: string, limit = 50): Promise<FollowerRecord[]> {
      return deps.followers.listByStore(storeId, limit);
    },
  };
}

export type CrmQueries = ReturnType<typeof makeCrmQueries>;

import type {
  CustomerProfile,
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
    countFollowers(storeId: string): Promise<number> {
      return deps.followers.countByStore(storeId);
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

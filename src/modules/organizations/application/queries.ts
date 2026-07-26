import { OrganizationRepository, StoreRecord, StoreRepository } from "./ports";
import { Plan } from "../domain/plan";

export interface OrganizationOverview {
  id: string;
  name: string;
  plan: Plan;
  subscriptionStatus: string | null;
  stores: StoreRecord[];
}

export function makeOrganizationQueries(deps: {
  organizations: OrganizationRepository;
  stores: StoreRepository;
}) {
  return {
    async listAllOrganizations(): Promise<OrganizationOverview[]> {
      const orgs = await deps.organizations.listAll();
      return Promise.all(
        orgs.map(async (org) => {
          const stores = await deps.stores.listByOrganization(org.id);
          return {
            id: org.id,
            name: org.name,
            plan: org.plan,
            subscriptionStatus: org.subscriptionStatus,
            stores,
          };
        }),
      );
    },

    async getOrganizationOverview(
      organizationId: string,
    ): Promise<OrganizationOverview | null> {
      const org = await deps.organizations.findById(organizationId);
      if (!org) return null;
      const stores = await deps.stores.listByOrganization(organizationId);
      return {
        id: org.id,
        name: org.name,
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        stores,
      };
    },
    async listStores(organizationId: string): Promise<StoreRecord[]> {
      return deps.stores.listByOrganization(organizationId);
    },

    async getStoreById(storeId: string): Promise<StoreRecord | null> {
      return deps.stores.findById(storeId);
    },

    async getOrganizationIdByStoreId(storeId: string): Promise<string | null> {
      const store = await deps.stores.findById(storeId);
      return store?.organizationId ?? null;
    },
  };
}

import { OrganizationRepository, StoreRecord, StoreRepository } from "./ports";

export interface OrganizationOverview {
  id: string;
  name: string;
  stores: StoreRecord[];
}

export function makeOrganizationQueries(deps: {
  organizations: OrganizationRepository;
  stores: StoreRepository;
}) {
  return {
    async getOrganizationOverview(
      organizationId: string,
    ): Promise<OrganizationOverview | null> {
      const org = await deps.organizations.findById(organizationId);
      if (!org) return null;
      const stores = await deps.stores.listByOrganization(organizationId);
      return { id: org.id, name: org.name, stores };
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

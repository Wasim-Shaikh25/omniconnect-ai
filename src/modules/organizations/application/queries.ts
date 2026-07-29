import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import type { SessionUser } from "@/modules/auth";
import { OrganizationInviteRecord, OrganizationInviteRepository, OrganizationRepository, StoreRecord, StoreRepository } from "./ports";
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
  invites?: OrganizationInviteRepository;
}) {
  return {
    async listAllOrganizations(
      pagination?: PaginationInput,
    ): Promise<PaginatedResult<OrganizationOverview>> {
      const orgs = await deps.organizations.listAll(pagination);
      const overviews = await Promise.all(
        orgs.items.map(async (org) => {
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
      return {
        ...orgs,
        items: overviews,
      };
    },

    async getOrganizationOverview(
      organizationId: string,
      user?: SessionUser,
    ): Promise<OrganizationOverview | null> {
      const org = await deps.organizations.findById(organizationId);
      if (!org) return null;
      let stores = await deps.stores.listByOrganization(organizationId);
      if (user?.role === "STAFF") {
        if (user.storeId) {
          stores = stores.filter((s) => s.id === user.storeId);
        } else {
          stores = [];
        }
      }
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

    async listPendingInvites(organizationId: string): Promise<OrganizationInviteRecord[]> {
      if (!deps.invites) return [];
      return deps.invites.listPendingByOrganization(organizationId);
    },
  };
}

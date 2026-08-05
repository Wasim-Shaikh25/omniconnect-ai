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
      userId: string,
      user?: SessionUser,
    ): Promise<OrganizationOverview | null> {
      const org = await deps.organizations.findById(userId);
      if (!org) return null;
      let stores = await deps.stores.listByOrganization(userId);
      if (user?.role === "USER") {
        if (user.projectId) {
          stores = stores.filter((s) => s.id === user.projectId);
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
    async listStores(userId: string): Promise<StoreRecord[]> {
      return deps.stores.listByOrganization(userId);
    },

    async getStoreById(projectId: string): Promise<StoreRecord | null> {
      return deps.stores.findById(projectId);
    },

    async getOrganizationIdByStoreId(projectId: string): Promise<string | null> {
      const store = await deps.stores.findById(projectId);
      return store?.userId ?? null;
    },

    async listPendingInvites(userId: string): Promise<OrganizationInviteRecord[]> {
      if (!deps.invites) return [];
      return deps.invites.listPendingByOrganization(userId);
    },
  };
}

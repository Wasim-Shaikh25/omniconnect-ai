import { ForbiddenError } from "@/modules/auth";
import type { SessionUser } from "@/modules/auth";

export interface TenantGuardQueries {
  getOrganizationIdByStoreId(storeId: string): Promise<string | null>;
}

export function makeTenantGuard(deps: { queries: TenantGuardQueries }) {
  return {
    assertStoreAccess: async (user: SessionUser, storeId: string): Promise<void> => {
      if (!user.organizationId) throw new ForbiddenError();
      const orgId = await deps.queries.getOrganizationIdByStoreId(storeId);
      if (!orgId || orgId !== user.organizationId) throw new ForbiddenError();
    },
    assertOrganizationAccess: (user: SessionUser, organizationId: string): void => {
      if (user.organizationId !== organizationId) throw new ForbiddenError();
    },
  };
}

export type TenantGuard = ReturnType<typeof makeTenantGuard>;

import { ForbiddenError } from "@/modules/auth";
import type { SessionUser } from "@/modules/auth";

export interface TenantGuardQueries {
  getOrganizationIdByStoreId(projectId: string): Promise<string | null>;
}

export function makeTenantGuard(deps: { queries: TenantGuardQueries }) {
  return {
    assertStoreAccess: async (user: SessionUser, projectId: string): Promise<void> => {
      if (user.role === "STAFF") {
        if (!user.projectId || user.projectId !== projectId) throw new ForbiddenError();
        return;
      }
      if (!user.userId) throw new ForbiddenError();
      const orgId = await deps.queries.getOrganizationIdByStoreId(projectId);
      if (!orgId || orgId !== user.userId) throw new ForbiddenError();
    },
    assertOrganizationAccess: (user: SessionUser, userId: string): void => {
      if (user.userId !== userId) throw new ForbiddenError();
    },
  };
}

export type TenantGuard = ReturnType<typeof makeTenantGuard>;

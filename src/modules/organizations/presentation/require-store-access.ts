import { getCurrentUser, ForbiddenError, UnauthorizedError } from "@/modules/auth";
import { organizationQueries, tenantGuard } from "../infrastructure/container";
import type { SessionUser } from "@/modules/auth";
import type { StoreRecord } from "../application/ports";

export type StoreAccess =
  | { ok: true; user: SessionUser; store: StoreRecord }
  | { ok: false; reason: "unauthenticated" | "notFound" };

/** Pure predicate: returns the user/store or a reason why access is denied.
 *  Does not call Next.js navigation helpers so callers can emit the right
 *  HTTP status from the page/route body before streaming begins.
 */
export async function checkStoreAccess(storeId: string): Promise<StoreAccess> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  try {
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, reason: "notFound" };
    }
    throw error;
  }

  const store = await organizationQueries.getStoreById(storeId);
  if (!store) return { ok: false, reason: "notFound" };

  return { ok: true, user, store };
}

/** Thin wrapper for server actions that need the old throw semantics. */
export async function requireStoreAccess(
  storeId: string,
): Promise<{ user: SessionUser; store: StoreRecord }> {
  const access = await checkStoreAccess(storeId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      throw new UnauthorizedError();
    }
    throw new ForbiddenError();
  }
  return { user: access.user, store: access.store };
}

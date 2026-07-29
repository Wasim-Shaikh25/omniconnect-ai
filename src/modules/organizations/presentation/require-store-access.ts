"use server";

import { notFound, redirect } from "next/navigation";
import { getCurrentUser, ForbiddenError } from "@/modules/auth";
import { organizationQueries, tenantGuard } from "../infrastructure/container";
import type { SessionUser } from "@/modules/auth";
import type { StoreRecord } from "../application/ports";

/**
 * Ensures the current user is authorized to access `storeId` and returns both
 * the user and the store. Redirects to login for unauthenticated users and
 * renders 404 when the store is missing or not in the user's scope.
 */
export async function requireStoreAccess(
  storeId: string,
): Promise<{ user: SessionUser; store: StoreRecord }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  try {
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

  const store = await organizationQueries.getStoreById(storeId);
  if (!store) notFound();

  return { user, store };
}

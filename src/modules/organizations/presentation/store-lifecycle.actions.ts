"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/modules/auth";
import { auditCommands } from "@/modules/users";
import {
  updateStore,
  archiveStore,
  restoreStore,
  deleteStore,
  tenantGuard,
} from "../infrastructure/container";
import { updateStoreSchema } from "../application/store-lifecycle";

export interface StoreLifecycleActionState {
  error?: string;
  ok?: boolean;
  fieldErrors?: Record<string, string[]>;
}

export async function updateStoreAction(
  _prev: StoreLifecycleActionState,
  formData: FormData,
): Promise<StoreLifecycleActionState> {
  const admin = await requireRole("STORE_OWNER");
  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || !storeId) {
    return { error: "Store ID is required" };
  }

  try {
    await tenantGuard.assertStoreAccess(admin, storeId);
  } catch {
    return { error: "Store not found in your organization." };
  }

  const raw = {
    storeId,
    name: formData.get("name") || undefined,
    provider: formData.get("provider") || undefined,
    domain: formData.get("domain") || null,
  };

  const parsed = updateStoreSchema.safeParse(raw);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const result = await updateStore(parsed.data);
  if (!result.ok) return { error: result.error.message };

  if (admin.organizationId) {
    await auditCommands.create({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "STORE_UPDATED",
      resource: "Store",
      resourceId: storeId,
      details: `Store updated by ${admin.email ?? admin.id}`,
    });
  }

  revalidatePath(`/stores/${storeId}`);
  revalidatePath(`/stores/${storeId}/settings`);
  return { ok: true };
}

export async function archiveStoreAction(
  _prev: StoreLifecycleActionState,
  formData: FormData,
): Promise<StoreLifecycleActionState> {
  const admin = await requireRole("STORE_OWNER");
  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || !storeId) {
    return { error: "Store ID is required" };
  }

  try {
    await tenantGuard.assertStoreAccess(admin, storeId);
  } catch {
    return { error: "Store not found in your organization." };
  }

  const result = await archiveStore(storeId);
  if (!result.ok) return { error: result.error.message };

  if (admin.organizationId) {
    await auditCommands.create({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "STORE_ARCHIVED",
      resource: "Store",
      resourceId: storeId,
    });
  }

  revalidatePath("/stores");
  revalidatePath(`/stores/${storeId}`);
  return { ok: true };
}

export async function restoreStoreAction(
  _prev: StoreLifecycleActionState,
  formData: FormData,
): Promise<StoreLifecycleActionState> {
  const admin = await requireRole("STORE_OWNER");
  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || !storeId) {
    return { error: "Store ID is required" };
  }

  try {
    await tenantGuard.assertStoreAccess(admin, storeId);
  } catch {
    return { error: "Store not found in your organization." };
  }

  const result = await restoreStore(storeId);
  if (!result.ok) return { error: result.error.message };

  if (admin.organizationId) {
    await auditCommands.create({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "STORE_RESTORED",
      resource: "Store",
      resourceId: storeId,
    });
  }

  revalidatePath("/stores");
  revalidatePath(`/stores/${storeId}`);
  return { ok: true };
}

export async function deleteStoreAction(
  _prev: StoreLifecycleActionState,
  formData: FormData,
): Promise<StoreLifecycleActionState> {
  const admin = await requireRole("STORE_OWNER");
  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || !storeId) {
    return { error: "Store ID is required" };
  }

  try {
    await tenantGuard.assertStoreAccess(admin, storeId);
  } catch {
    return { error: "Store not found in your organization." };
  }

  const result = await deleteStore(storeId);
  if (!result.ok) return { error: result.error.message };

  if (admin.organizationId) {
    await auditCommands.create({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "STORE_DELETED",
      resource: "Store",
      resourceId: storeId,
    });
  }

  revalidatePath("/stores");
  redirect("/stores");
}

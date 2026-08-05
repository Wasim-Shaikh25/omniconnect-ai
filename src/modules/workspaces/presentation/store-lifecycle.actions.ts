"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/modules/auth";
import { auditCommands } from "@/modules/users";
import {
  updateStore,
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
  const admin = await requireRole("USER");
  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    return { error: "Store ID is required" };
  }

  try {
    await tenantGuard.assertStoreAccess(admin, projectId);
  } catch {
    return { error: "Store not found in your organization." };
  }

  const raw = {
    projectId,
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

  if (admin.userId) {
    await auditCommands.create({
      userId: admin.userId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "STORE_UPDATED",
      resource: "Store",
      resourceId: projectId,
      details: `Store updated by ${admin.email ?? admin.id}`,
    });
  }

  revalidatePath(`/stores/${projectId}`);
  revalidatePath(`/stores/${projectId}/settings`);
  return { ok: true };
}


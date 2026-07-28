"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireRole, requireSuperAdmin } from "@/modules/auth";
import { tenantGuard } from "@/modules/organizations";
import { updateProfileSchema } from "../application/update-profile";
import { changeRoleSchema } from "../application/change-role";
import {
  updateProfile,
  changeUserRole,
  auditCommands,
  listAllUsers,
  setUserSuperAdmin,
  setUserStore,
  userRepository,
} from "../infrastructure/container";

export interface ProfileActionState {
  error?: string;
  ok?: boolean;
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name") || undefined,
    image: formData.get("image") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await updateProfile(user.id, parsed.data);
  if (!result.ok) return { error: result.error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function changeUserRoleAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireRole("STORE_OWNER");
  const parsed = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await changeUserRole(parsed.data, {
    id: admin.id,
    role: admin.role,
    organizationId: admin.organizationId,
  });
  if (!result.ok) return { error: result.error.message };

  if (admin.organizationId) {
    await auditCommands.create({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "USER_ROLE_CHANGED",
      resource: "User",
      resourceId: parsed.data.userId,
      details: `Role changed to ${parsed.data.role}`,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/audit");
  return { ok: true };
}

export async function changeUserStoreAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireRole("STORE_OWNER");
  const userId = formData.get("userId");
  const storeId = formData.get("storeId");
  if (typeof userId !== "string" || !userId) {
    return { error: "User ID is required" };
  }

  const target = await userRepository.findById(userId);
  if (!target || target.organizationId !== admin.organizationId) {
    return { error: "User not found in your organization." };
  }

  const assignedStoreId = typeof storeId === "string" && storeId.trim() ? storeId.trim() : null;
  if (assignedStoreId) {
    try {
      await tenantGuard.assertStoreAccess(admin, assignedStoreId);
    } catch {
      return { error: "Selected store does not belong to your organization." };
    }
  }

  await setUserStore(userId, assignedStoreId);

  if (admin.organizationId) {
    await auditCommands.create({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email ?? undefined,
      action: "USER_STORE_CHANGED",
      resource: "User",
      resourceId: userId,
      details: `Store assignment changed to ${assignedStoreId ?? "none"}`,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/audit");
  return { ok: true };
}

const DEFAULT_PAGE_LIMIT = 20;

function parsePagination(
  pageRaw: string | number | undefined,
  limitRaw: string | number | undefined,
) {
  const page =
    typeof pageRaw === "string"
      ? Number.parseInt(pageRaw, 10)
      : typeof pageRaw === "number"
        ? pageRaw
        : 1;
  const limit =
    typeof limitRaw === "string"
      ? Number.parseInt(limitRaw, 10)
      : typeof limitRaw === "number"
        ? limitRaw
        : DEFAULT_PAGE_LIMIT;
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_PAGE_LIMIT,
  };
}

export async function listAllUsersAction(
  page?: string | number,
  limit?: string | number,
) {
  await requireSuperAdmin();
  return listAllUsers(parsePagination(page, limit));
}

export async function toggleUserSuperAdminAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
) {
  const admin = await requireSuperAdmin();
  const userId = formData.get("userId");
  const isSuperAdminRaw = formData.get("isSuperAdmin");
  if (typeof userId !== "string" || !userId) return { error: "User ID is required" };
  const isSuperAdmin = isSuperAdminRaw === "true";

  const user = await setUserSuperAdmin(userId, isSuperAdmin);

  await auditCommands.create({
    organizationId: admin.organizationId ?? null,
    actorId: admin.id,
    actorEmail: admin.email,
    action: isSuperAdmin ? "USER_PROMOTED_SUPER_ADMIN" : "USER_DEMOTED_SUPER_ADMIN",
    resource: "User",
    resourceId: userId,
    details: `Super admin set to ${isSuperAdmin}`,
  });

  revalidatePath("/admin/users");
  return { ok: true, user };
}

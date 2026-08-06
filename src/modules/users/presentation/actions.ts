"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireRole, requireSuperAdmin } from "@/modules/auth";
import { tenantGuard } from "@/modules/workspaces";
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
  dataExportService,
  deleteAccountService,
  setUserSuspended,
  setUserBanned,
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
  const admin = await requireRole("USER");
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
    userId: admin.userId,
  });
  if (!result.ok) return { error: result.error.message };

  if (admin.userId) {
    await auditCommands.create({
      userId: admin.userId,
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
  const admin = await requireRole("USER");
  const userId = formData.get("userId");
  const projectId = formData.get("projectId");
  if (typeof userId !== "string" || !userId) {
    return { error: "User ID is required" };
  }

  const target = await userRepository.findById(userId);
  if (!target || target.userId !== admin.userId) {
    return { error: "User not found in your organization." };
  }

  const assignedStoreId = typeof projectId === "string" && projectId.trim() ? projectId.trim() : null;
  if (assignedStoreId) {
    try {
      await tenantGuard.assertStoreAccess(admin, assignedStoreId);
    } catch {
      return { error: "Selected store does not belong to your organization." };
    }
  }

  await setUserStore(userId, assignedStoreId);

  if (admin.userId) {
    await auditCommands.create({
      userId: admin.userId,
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

export async function listAllUsersAction(options?: {
  page?: string | number;
  limit?: string | number;
  search?: string;
  role?: string;
  isSuperAdmin?: string;
  plan?: string;
  status?: string;
}) {
  await requireSuperAdmin();
  const filter: import("../application/ports").UserListFilter = {};
  if (options?.search) filter.search = options.search;
  if (options?.role === "USER" || options?.role === "SUPER_ADMIN") filter.role = options.role;
  if (options?.isSuperAdmin === "true") filter.isSuperAdmin = true;
  if (options?.isSuperAdmin === "false") filter.isSuperAdmin = false;
  if (options?.plan) filter.plan = options.plan;
  if (options?.status === "active" || options?.status === "suspended" || options?.status === "banned") {
    filter.status = options.status;
  }
  return listAllUsers(parsePagination(options?.page, options?.limit), filter);
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
    userId: admin.userId ?? null,
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

export async function suspendUserAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
) {
  const admin = await requireSuperAdmin();
  const userId = formData.get("userId");
  const suspendedRaw = formData.get("suspended");
  if (typeof userId !== "string" || !userId) return { error: "User ID is required" };
  const suspended = suspendedRaw === "true";

  const user = await setUserSuspended(userId, suspended);

  await auditCommands.create({
    userId: admin.userId ?? null,
    actorId: admin.id,
    actorEmail: admin.email,
    action: suspended ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
    resource: "User",
    resourceId: userId,
    details: `User ${suspended ? "suspended" : "unsuspended"}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, user };
}

export async function banUserAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
) {
  const admin = await requireSuperAdmin();
  const userId = formData.get("userId");
  const bannedRaw = formData.get("banned");
  if (typeof userId !== "string" || !userId) return { error: "User ID is required" };
  const banned = bannedRaw === "true";

  const user = await setUserBanned(userId, banned);

  await auditCommands.create({
    userId: admin.userId ?? null,
    actorId: admin.id,
    actorEmail: admin.email,
    action: banned ? "USER_BANNED" : "USER_UNBANNED",
    resource: "User",
    resourceId: userId,
    details: `User ${banned ? "banned" : "unbanned"}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, user };
}

export async function requestDataExportAction(): Promise<{ downloadUrl?: string; error?: string; ok?: boolean }> {
  const user = await requireUser();
  try {
    const exportRequest = await dataExportService.requestExport(user.id);
    return { downloadUrl: exportRequest.downloadUrl ?? undefined, ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create export" };
  }
}

export async function listDataExportsAction() {
  const user = await requireUser();
  return dataExportService.listExports(user.id);
}

export async function deleteAccountAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();
  const reasonRaw = formData.get("reason");
  const confirmation = formData.get("confirmation");
  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm account deletion." };
  }
  const reason = typeof reasonRaw === "string" ? reasonRaw : undefined;
  await deleteAccountService.deleteAccount(user.id, reason);
  revalidatePath("/");
  return { ok: true };
}

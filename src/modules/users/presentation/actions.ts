"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireRole, requireSuperAdmin } from "@/modules/auth";
import { updateProfileSchema } from "../application/update-profile";
import { changeRoleSchema } from "../application/change-role";
import {
  updateProfile,
  changeUserRole,
  auditCommands,
  listAllUsers,
  setUserSuperAdmin,
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

export async function listAllUsersAction() {
  await requireSuperAdmin();
  return listAllUsers();
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
    organizationId: "platform",
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

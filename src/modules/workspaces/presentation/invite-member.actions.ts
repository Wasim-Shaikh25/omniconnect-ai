"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { requireRole, registerUser, registerUserSchema, signIn, emailVerificationService } from "@/modules/auth";
import { env } from "@/shared/config";
import { inviteMemberSchema } from "../application/invite-member";
import {
  inviteMember,
  revokeInvite,
  resendInvite,
  validateOrganizationInvite,
  acceptOrganizationInvite,
  tenantGuard,
  organizationQueries,
} from "../infrastructure/container";
import { removeUserFromOrganization } from "@/modules/users";

export interface InviteMemberActionState {
  error?: string;
  ok?: boolean;
  fieldErrors?: Record<string, string[]>;
}

function validationState(error: import("zod").ZodError): InviteMemberActionState {
  const { fieldErrors } = error.flatten();
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: fieldErrors as Record<string, string[]>,
  };
}

export async function inviteOrganizationMemberAction(
  _prev: InviteMemberActionState,
  formData: FormData,
): Promise<InviteMemberActionState> {
  const user = await requireRole("USER");
  if (!user.userId) {
    return { error: "You must belong to an organization to invite members." };
  }

  const raw = {
    email: formData.get("email"),
    role: formData.get("role") ?? "USER",
    projectId: formData.get("projectId") ?? undefined,
  };

  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return validationState(parsed.error);
  }

  const projectId = parsed.data.projectId?.trim();
  if (projectId) {
    try {
      await tenantGuard.assertStoreAccess(user, projectId);
    } catch {
      return { error: "Selected store does not belong to your organization." };
    }
  }

  const result = await inviteMember({
    ...parsed.data,
    userId: user.userId,
    createdByUserId: user.id,
  });

  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function registerWithInviteAction(
  _prev: { error?: string; message?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; message?: string; ok?: boolean }> {
  const token = formData.get("inviteToken");
  const projectId = formData.get("projectId");
  const raw = {
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    phone: formData.get("phone") || undefined,
  };

  const parsed = registerUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (typeof token !== "string" || !token) {
    return { error: "Invite token is missing." };
  }

  const inviteResult = await validateOrganizationInvite(token);
  if (!inviteResult.ok) {
    return { error: inviteResult.error.message };
  }

  const invite = inviteResult.value;
  const email = parsed.data.email.toLowerCase().trim();
  if (email !== invite.email) {
    return { error: "Email does not match the invite." };
  }

  let assignedStoreId: string | null = invite.projectId ?? null;
  if (!assignedStoreId && typeof projectId === "string" && projectId.trim()) {
    const storeOrganizationId = await organizationQueries.getOrganizationIdByStoreId(projectId);
    if (storeOrganizationId !== invite.userId) {
      return { error: "Selected store does not belong to the inviting organization." };
    }
    assignedStoreId = projectId;
  }

  const emailVerified = env.REQUIRE_EMAIL_VERIFICATION ? null : new Date();
  const registerResult = await registerUser(parsed.data, {
    userId: invite.userId,
    role: invite.role,
    projectId: assignedStoreId,
    emailVerified,
  });
  if (!registerResult.ok) {
    return { error: registerResult.error.message };
  }

  if (registerResult.value.isExisting) {
    return {
      ok: true,
      message: "An account with this email already exists. Sign in to accept the invite.",
    };
  }

  const acceptResult = await acceptOrganizationInvite(token);
  if (!acceptResult.ok) {
    return { error: acceptResult.error.message };
  }

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    await emailVerificationService.issue(registerResult.value.id, registerResult.value.email, "signup");
    return { ok: true, message: "Check your email to verify your account before signing in." };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed." };
    }
    throw error;
  }
  redirect("/dashboard");
}

export async function revokeInviteAction(inviteId: string): Promise<InviteMemberActionState> {
  const user = await requireRole("USER");
  if (!user.userId) return { error: "No organization." };
  const result = await revokeInvite({ inviteId, userId: user.userId });
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function resendInviteAction(inviteId: string): Promise<InviteMemberActionState> {
  const user = await requireRole("USER");
  if (!user.userId) return { error: "No organization." };
  const result = await resendInvite({ inviteId, userId: user.userId });
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeOrganizationMemberAction(userId: string): Promise<InviteMemberActionState> {
  const admin = await requireRole("USER");
  if (!admin.userId) return { error: "No organization." };
  const { getUserProfile } = await import("@/modules/users");
  const target = await getUserProfile(userId);
  if (!target || target.userId !== admin.userId) {
    return { error: "Member not found in your organization." };
  }
  await removeUserFromOrganization(userId);
  revalidatePath("/settings");
  return { ok: true };
}

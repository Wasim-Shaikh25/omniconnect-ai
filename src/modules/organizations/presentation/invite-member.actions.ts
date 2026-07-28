"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { requireRole, registerUser, registerUserSchema, signIn } from "@/modules/auth";
import { inviteMemberSchema } from "../application/invite-member";
import {
  inviteMember,
  validateOrganizationInvite,
  acceptOrganizationInvite,
} from "../infrastructure/container";

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
  const user = await requireRole("STORE_OWNER");
  if (!user.organizationId) {
    return { error: "You must belong to an organization to invite members." };
  }

  const raw = {
    email: formData.get("email"),
    role: formData.get("role") ?? "STAFF",
  };

  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return validationState(parsed.error);
  }

  const result = await inviteMember({
    ...parsed.data,
    organizationId: user.organizationId,
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
  const raw = {
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
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

  const registerResult = await registerUser(parsed.data, {
    organizationId: invite.organizationId,
    role: invite.role,
  });
  if (!registerResult.ok) {
    return { error: registerResult.error.message };
  }

  const acceptResult = await acceptOrganizationInvite(token);
  if (!acceptResult.ok) {
    return { error: acceptResult.error.message };
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

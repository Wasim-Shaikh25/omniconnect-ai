"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { registerUser, verificationCodeService, accounts, hasher } from "../infrastructure/container";
import { signIn, signOut } from "../infrastructure/auth";
import { registerUserSchema } from "../application/register-user";
import { isSuperAdmin } from "../infrastructure/super-admin";

export interface ActionState {
  error?: string;
  mfaRequired?: boolean;
  message?: string;
  ok?: boolean;
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerUserSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) return { error: result.error.message };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Registered, but automatic sign-in failed." };
    }
    throw error;
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (typeof provider !== "string") return;
  await signIn(provider, { redirectTo: "/dashboard" });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    mfaCode: formData.get("mfaCode") || undefined,
  });
  if (!parsed.success) return { error: "Invalid email or password" };

  if (isSuperAdmin(parsed.data.email) && !parsed.data.mfaCode) {
    await verificationCodeService.sendCode(parsed.data.email, "mfa");
    return { mfaRequired: true, message: "A verification code was sent to your email." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      mfaCode: parsed.data.mfaCode,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email, password, or verification code." };
    }
    throw error;
  }
  redirect("/dashboard");
}

const requestResetSchema = z.object({
  email: z.string().email(),
});

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "Enter a valid email address." };

  // Always appear to succeed to avoid account enumeration.
  try {
    const account = await accounts.findByEmail(parsed.data.email);
    if (account) {
      await verificationCodeService.sendCode(parsed.data.email, "reset");
    }
  } catch {
    // ignore: do not leak whether the account exists
  }
  return { ok: true, message: "If this account exists, a reset code has been sent." };
}

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
  password: z.string().min(8).max(200),
});

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const valid = await verificationCodeService.verifyCode(parsed.data.email, parsed.data.code, "reset");
  if (!valid) return { error: "Invalid or expired reset code." };

  const account = await accounts.findByEmail(parsed.data.email);
  if (!account) return { error: "Invalid or expired reset code." };

  const passwordHash = await hasher.hash(parsed.data.password);
  await accounts.updatePassword({ id: account.id, passwordHash });

  return { ok: true, message: "Password updated. You can now sign in." };
}

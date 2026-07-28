"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { registerUser, verificationCodeService, accounts, hasher } from "../infrastructure/container";
import { signIn, signOut } from "../infrastructure/auth";
import { registerUserSchema } from "../application/register-user";
import { rateLimit } from "@/shared/security/rate-limit";

export interface ActionState {
  error?: string;
  mfaRequired?: boolean;
  message?: string;
  ok?: boolean;
}

async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

function redirectPathForUser(
  organizationId: string | null | undefined,
): "/dashboard" | "/onboarding" {
  return organizationId ? "/dashboard" : "/onboarding";
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
  // OAuth users are provisioned synchronously in the JWT callback, so they can
  // land on the dashboard immediately. If provisioning fails they are redirected
  // to /onboarding from /dashboard.
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

  const email = parsed.data.email.toLowerCase().trim();

  const ip = await clientIpFromHeaders();
  const limit = await rateLimit({
    key: `login-action:${email}:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again later." };
  }

  const account = await accounts.findByEmail(email);
  if (!account?.passwordHash) {
    return { error: "Invalid email or password." };
  }

  if (account.isSuperAdmin && !parsed.data.mfaCode) {
    await verificationCodeService.sendCode(email, "mfa");
    return { mfaRequired: true, message: "A verification code was sent to your email." };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      mfaCode: parsed.data.mfaCode,
      redirectTo: redirectPathForUser(account.organizationId),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email, password, or verification code." };
    }
    throw error;
  }
  redirect(redirectPathForUser(account.organizationId));
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

  const ip = await clientIpFromHeaders();
  const limit = await rateLimit({
    key: `reset-request:${parsed.data.email}:${ip}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { ok: true, message: "If this account exists, a reset code has been sent." };
  }

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

  const ip = await clientIpFromHeaders();
  const limit = await rateLimit({
    key: `reset-action:${parsed.data.email}:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again later." };
  }

  const valid = await verificationCodeService.verifyCode(parsed.data.email, parsed.data.code, "reset");
  if (!valid) return { error: "Invalid or expired reset code." };

  const account = await accounts.findByEmail(parsed.data.email);
  if (!account) return { error: "Invalid or expired reset code." };

  const passwordHash = await hasher.hash(parsed.data.password);
  await accounts.updatePassword({ id: account.id, passwordHash });
  // updatePassword already increments tokenVersion, invalidating existing sessions.

  return { ok: true, message: "Password updated. You can now sign in." };
}

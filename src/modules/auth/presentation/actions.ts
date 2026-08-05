"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";
import { env } from "@/shared/config";
import { createEmailSender } from "@/shared/email";
import { auditCommands } from "@/modules/users";
import {
  registerUser,
  verificationCodeService,
  accounts,
  hasher,
  emailVerificationService,
  changePasswordService,
  changeEmailService,
  phoneVerificationService,
} from "../infrastructure/container";
import { signIn, signOut, RateLimitAuthError, unstable_update } from "../infrastructure/auth";
import { requireUser } from "../infrastructure/session";
import { registerUserSchema } from "../application/register-user";
import { changePasswordSchema } from "../application/change-password";
import { requestEmailChangeSchema } from "../application/change-email";
import { isE164Phone } from "../domain/phone";
import { verifyTurnstileToken } from "../infrastructure/turnstile";
import { clientIp, rateLimit } from "@/shared/security/rate-limit";
import { smsSender } from "@/modules/notifications";

const emailSender = createEmailSender();

export interface ActionState {
  error?: string;
  mfaRequired?: boolean;
  unverified?: boolean;
  email?: string;
  message?: string;
  ok?: boolean;
}

function redirectPathForUser(
  userId: string | null | undefined,
): "/dashboard" | "/onboarding" {
  return userId ? "/dashboard" : "/onboarding";
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerUserSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const turnstileToken = formData.get("cf-turnstile-response");
  const ip = clientIp(await headers());
  if (
    env.TURNSTILE_SECRET_KEY &&
    !(await verifyTurnstileToken(typeof turnstileToken === "string" ? turnstileToken : "", ip))
  ) {
    return { error: "Bot verification failed. Please try again." };
  }

  const emailVerified = env.REQUIRE_EMAIL_VERIFICATION ? null : new Date();
  const result = await registerUser(parsed.data, { emailVerified });
  if (!result.ok) return { error: result.error.message };

  if (result.value.isExisting) {
    await emailVerificationService.sendRegistrationAttempt(result.value.email);
    return {
      ok: true,
      message: "If this email is available, a verification link has been sent.",
    };
  }

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    await emailVerificationService.issue(result.value.id, result.value.email, "signup");
    return {
      ok: true,
      message: "Check your email to verify your account.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Registered, but automatic sign-in failed." };
    }
    throw error;
  }
  redirect("/onboarding");
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

  const account = await accounts.findByEmailIncludingDeleted(email);
  if (!account?.passwordHash) {
    return { error: "Invalid email, password, or verification code." };
  }

  if (account.isSuperAdmin && !parsed.data.mfaCode) {
    const code = await verificationCodeService.sendCode(email, "mfa");
    const phone = env.SUPER_ADMIN_PHONE || account.phone;
    if (smsSender && phone && isE164Phone(phone)) {
      await smsSender.send({
        to: phone,
        body: `Your OmniConnect verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      });
    }
    return { mfaRequired: true, message: "A verification code was sent to your email and phone (if configured)." };
  }

  if (env.REQUIRE_EMAIL_VERIFICATION && !account.emailVerified) {
    return {
      unverified: true,
      email,
      message: "Please verify your email address before signing in.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      mfaCode: parsed.data.mfaCode,
      redirectTo: redirectPathForUser(account.id),
    });
  } catch (error) {
    if (error instanceof RateLimitAuthError) {
      const minutes = Math.max(1, Math.ceil(error.retryAfterMs / 60_000));
      return {
        error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }
    if (error instanceof CredentialsSignin && error.code === "unverifiedEmail") {
      return {
        unverified: true,
        email,
        message: "Please verify your email address before signing in.",
      };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email, password, or verification code." };
    }
    throw error;
  }
  redirect(redirectPathForUser(account.id));
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

  const ip = clientIp(await headers());
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

  const ip = clientIp(await headers());
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

const resendVerificationEmailSchema = z.object({
  email: z.string().email(),
});

export async function resendVerificationEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resendVerificationEmailSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const email = parsed.data.email.toLowerCase().trim();
  const ip = clientIp(await headers());
  const limit = await rateLimit({
    key: `resend-verification:${email}:${ip}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { ok: true, message: "If this account is unverified, a new verification link has been sent." };
  }

  await emailVerificationService.resend(email);
  return { ok: true, message: "If this account is unverified, a new verification link has been sent." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limit = await rateLimit({
    key: `password-change:${user.id}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again later." };
  }

  const result = await changePasswordService.change({
    userId: user.id,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });
  if (!result.ok) return { error: result.error.message };

  await emailSender.send(
    user.email,
    "Your OmniConnect password has been changed",
    "Your password was changed. If this was not you, reset your password immediately.",
  );

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email,
    action: "USER_PASSWORD_CHANGED",
    resource: "User",
    resourceId: user.id,
  });

  try {
    await unstable_update({});
  } catch {
    // Session refresh is best-effort; the password change is already persisted.
  }

  return { ok: true, message: "Password changed successfully." };
}

export async function requestEmailChangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = requestEmailChangeSchema.safeParse({
    newEmail: formData.get("newEmail"),
    confirmNewEmail: formData.get("confirmNewEmail"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limit = await rateLimit({
    key: `email-change:${user.id}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again later." };
  }

  const result = await changeEmailService.request({
    userId: user.id,
    newEmail: parsed.data.newEmail,
    currentPassword: parsed.data.currentPassword,
  });
  if (!result.ok) return { error: result.error.message };

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email,
    action: "USER_EMAIL_CHANGE_REQUESTED",
    resource: "User",
    resourceId: user.id,
    details: `Requested change to ${parsed.data.newEmail.toLowerCase().trim()}`,
  });

  return { ok: true, message: "Check your new email address to confirm the change." };
}

const requestPhoneVerificationSchema = z.object({
  phone: z.string().min(1),
});

export async function requestPhoneVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = requestPhoneVerificationSchema.safeParse({
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: "Enter a valid phone number." };

  const result = await phoneVerificationService.request(user.id, parsed.data.phone);
  return result.success
    ? { ok: true, message: "A verification code has been sent to your phone." }
    : { error: result.error };
}

const verifyPhoneSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export async function verifyPhoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = verifyPhoneSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid code." };

  const result = await phoneVerificationService.verify(user.id, parsed.data.code);
  if (!result.success) return { error: result.error };

  try {
    await unstable_update({});
  } catch {
    // Session refresh is best-effort; the phone number is already persisted.
  }

  return { ok: true, message: "Your phone number has been verified." };
}

export async function removePhoneAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _prev;
  void _formData;
  const user = await requireUser();
  const result = await phoneVerificationService.remove(user.id);
  if (!result.success) return { error: result.error };

  try {
    await unstable_update({});
  } catch {
    // Session refresh is best-effort.
  }

  return { ok: true, message: "Your phone number has been removed." };
}

export async function signOutEverywhereAction(): Promise<ActionState> {
  const user = await requireUser();
  const updated = await accounts.bumpTokenVersion(user.id);
  if (!updated) return { error: "Could not sign out everywhere. Please try again." };

  await auditCommands.create({
    userId: user.id,
    actorId: user.id,
    actorEmail: user.email,
    action: "USER_SIGN_OUT_EVERYWHERE",
    resource: "User",
    resourceId: user.id,
    details: JSON.stringify({ tokenVersion: updated.tokenVersion }),
  });

  return { ok: true, message: "All other sessions have been signed out." };
}

"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { registerUser } from "../infrastructure/container";
import { signIn, signOut } from "../infrastructure/auth";
import { registerUserSchema } from "../application/register-user";
import { PrismaAccountRepository } from "../infrastructure/account.repository";
import { BcryptPasswordHasher } from "../infrastructure/password-hasher";
import { isSuperAdmin } from "../infrastructure/super-admin";
import { createVerificationCode, consumeVerificationCode } from "../infrastructure/verification";
import { createEmailSender } from "../infrastructure/email";
import { env } from "@/shared/config";

export interface ActionState {
  error?: string;
  info?: string;
  mfaRequired?: boolean;
}

const accounts = new PrismaAccountRepository();
const hasher = new BcryptPasswordHasher();
const emailSender = createEmailSender();

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

  const email = parsed.data.email.toLowerCase().trim();
  const redirectTo = isSuperAdmin(email) ? "/admin" : "/dashboard";

  if (isSuperAdmin(email) && !parsed.data.mfaCode) {
    const account = await accounts.findByEmail(email);
    if (!account?.passwordHash) return { error: "Invalid email or password" };
    const valid = await hasher.compare(parsed.data.password, account.passwordHash);
    if (!valid) return { error: "Invalid email or password" };

    const result = await createVerificationCode(email, "mfa");
    if (result.code) {
      await emailSender.send({
        to: email,
        subject: "Your OmniConnect admin login code",
        text: `Your admin login code is: ${result.code}\n\nThis code expires in 10 minutes.`,
      });
    }
    return { mfaRequired: true, info: "Check your email for the admin login code." };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      mfaCode: parsed.data.mfaCode,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  redirect(redirectTo);
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email" };

  const email = parsed.data.email.toLowerCase().trim();
  const account = await accounts.findByEmail(email);
  if (!account) {
    return { info: "If an account exists, a reset link has been sent." };
  }

  const result = await createVerificationCode(email, "reset");
  if (result.code) {
    const url = `${env.APP_URL}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(result.code)}`;
    await emailSender.send({
      to: email,
      subject: "Reset your OmniConnect password",
      text: `Reset your password here: ${url}\n\nThis link expires in 1 hour.`,
    });
  }
  return { info: "If an account exists, a reset link has been sent." };
}

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  password: z.string().min(8),
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

  const email = parsed.data.email.toLowerCase().trim();
  const account = await accounts.findByEmail(email);
  if (!account) return { error: "Invalid reset link" };

  const consumed = await consumeVerificationCode(email, "reset", parsed.data.code);
  if (!consumed) return { error: "Reset link expired or invalid" };

  const passwordHash = await hasher.hash(parsed.data.password);
  await accounts.updatePassword(account.id, passwordHash);

  redirect("/login?reset=1");
}

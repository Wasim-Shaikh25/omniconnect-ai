"use server";

import { z } from "zod";
import { AuthError as NextAuthError } from "next-auth";
import { registerUser } from "../infrastructure/container";
import { signIn, signOut } from "../infrastructure/auth";
import { registerUserSchema } from "../application/register-user";

export interface ActionState {
  error?: string;
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
    if (error instanceof NextAuthError) {
      return { error: "Registered, but automatic sign-in failed." };
    }
    throw error;
  }
  return {};
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
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid email or password" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof NextAuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  return {};
}

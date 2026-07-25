"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
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

export async function googleSignInAction(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
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
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  redirect("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import {
  requireRole,
  requireUser,
  requireSuperAdmin,
  requireVerifiedEmail,
  ForbiddenError,
  unstable_update,
} from "@/modules/auth";
import { createStore, createOrganization, organizationQueries } from "../infrastructure/container";
import { createStoreSchema } from "../application/create-store";
import { createOrganizationSchema } from "../application/create-organization";

export interface StoreActionState {
  error?: string;
  ok?: boolean;
}

export async function createStoreAction(
  _prev: StoreActionState,
  formData: FormData,
): Promise<StoreActionState> {
  const user = await requireRole("STORE_OWNER");
  await requireVerifiedEmail(user);
  if (!user.organizationId) {
    return { error: "No organization is linked to your account yet." };
  }

  const parsed = createStoreSchema.safeParse({
    organizationId: user.organizationId,
    name: formData.get("name"),
    provider: formData.get("provider") || undefined,
    domain: formData.get("domain") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createStore(parsed.data);
    if (!result.ok) return { error: result.error.message };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath("/stores");
  return { ok: true };
}

const DEFAULT_PAGE_LIMIT = 20;

function parsePage(raw: string | number | undefined) {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseLimit(raw: string | number | undefined) {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : DEFAULT_PAGE_LIMIT;
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : DEFAULT_PAGE_LIMIT;
}

export async function listAllOrganizationsAction(
  page?: string | number,
  limit?: string | number,
) {
  await requireSuperAdmin();
  return organizationQueries.listAllOrganizations({
    page: parsePage(page),
    limit: parseLimit(limit),
  });
}

export interface OnboardingActionState {
  error?: string;
  ok?: boolean;
}

export async function completeOnboardingAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireUser();
  if (user.organizationId) {
    return { ok: true };
  }

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await createOrganization({
      userId: user.id,
      userEmail: user.email,
      name: parsed.data.name,
    });
    // Refresh the JWT/session so the new organizationId and tokenVersion are
    // reflected immediately; otherwise `getCurrentUser` will reject the stale
    // session and log the user out.
    await unstable_update({});
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create workspace" };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

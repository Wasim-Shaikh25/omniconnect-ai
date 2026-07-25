"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { updateAIConfiguration } from "../infrastructure/container";
import { updateAIConfigSchema } from "../application/update-config";

export interface AIActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

/** Ensures the current user's organization owns the target store. */
async function assertStoreInOrg(
  organizationId: string | null,
  storeId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const overview =
    await organizationQueries.getOrganizationOverview(organizationId);
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

export async function updateAIConfigurationAction(
  _prev: AIActionState,
  formData: FormData,
): Promise<AIActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = updateAIConfigSchema.safeParse({
    storeId: formData.get("storeId"),
    systemPrompt: formData.get("systemPrompt"),
    tone: formData.get("tone") || undefined,
    welcomeStrategy: formData.get("welcomeStrategy") || undefined,
    couponStrategy: formData.get("couponStrategy") || undefined,
    salesStrategy: formData.get("salesStrategy") || undefined,
    escalationRules: formData.get("escalationRules") || undefined,
    model: formData.get("model") || "gpt-4o-mini",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await updateAIConfiguration(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/stores/${parsed.data.storeId}`);
  return { ok: true, message: "AI configuration saved." };
}

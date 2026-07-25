"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { updateAIConfiguration, generateCaptions, generateTrends } from "../infrastructure/container";
import { updateAIConfigSchema } from "../application/update-config";
import type { GeneratedCaption } from "../application/generate-captions";
import type { TrendIdea } from "../application/generate-trends";

export interface AIActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export interface GenerateCaptionsState {
  error?: string;
  captions?: GeneratedCaption[];
}

export interface GenerateTrendsState {
  error?: string;
  trends?: TrendIdea[];
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

const generateCaptionsSchema = z.object({
  storeId: z.string().min(1),
  mediaType: z.enum(["POST", "REEL", "STORY"]),
  productTagIds: z.array(z.string()).default([]),
  niche: z.string().optional(),
  goal: z.string().optional(),
});

export async function generateCaptionsAction(
  _prev: GenerateCaptionsState,
  formData: FormData,
): Promise<GenerateCaptionsState> {
  const user = await requireRole("STORE_OWNER");

  const rawTagIds = formData.getAll("productTagIds");
  const parsed = generateCaptionsSchema.safeParse({
    storeId: formData.get("storeId"),
    mediaType: formData.get("mediaType"),
    productTagIds: rawTagIds.filter((v): v is string => typeof v === "string"),
    niche: formData.get("niche") || undefined,
    goal: formData.get("goal") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const products = await ecommerceQueries.listProducts(parsed.data.storeId, 100);
  const selected = products.filter((p) => parsed.data.productTagIds.includes(p.id));

  try {
    const captions = await generateCaptions({
      storeId: parsed.data.storeId,
      mediaType: parsed.data.mediaType,
      productNames: selected.map((p) => p.title),
      niche: parsed.data.niche ?? null,
      goal: parsed.data.goal ?? null,
    });
    return { captions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate captions" };
  }
}

const generateTrendsSchema = z.object({
  storeId: z.string().min(1),
  niche: z.string().min(1).max(120),
  format: z.enum(["REEL", "POST", "CAROUSEL", "STORY", "ANY"]).optional(),
  count: z.coerce.number().min(1).max(10).optional(),
});

export async function generateTrendsAction(
  _prev: GenerateTrendsState,
  formData: FormData,
): Promise<GenerateTrendsState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = generateTrendsSchema.safeParse({
    storeId: formData.get("storeId"),
    niche: formData.get("niche"),
    format: formData.get("format") || undefined,
    count: formData.get("count") ? Number(formData.get("count")) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const trends = await generateTrends({
      storeId: parsed.data.storeId,
      niche: parsed.data.niche,
      format: parsed.data.format ?? null,
      count: parsed.data.count,
    });
    return { trends };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate trends" };
  }
}

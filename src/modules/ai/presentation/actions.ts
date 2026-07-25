"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { updateAIConfiguration, generateCaptions, generateTrends, generatePostIdeas, askBusinessBrain } from "../infrastructure/container";
import { updateAIConfigSchema } from "../application/update-config";
import type { GeneratedCaption } from "../application/generate-captions";
import type { TrendIdea } from "../application/generate-trends";
import type { BusinessBrainAnswer } from "../application/ask-business-brain";

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

export interface GeneratePostIdeasState {
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

const generatePostIdeasSchema = z.object({
  storeId: z.string().min(1),
  caption: z.string().max(5000).optional(),
  hashtags: z.string().max(2000).optional(),
  mediaType: z.string().max(50),
  ownerUsername: z.string().max(120).optional(),
  likes: z.coerce.number().min(0).default(0),
  comments: z.coerce.number().min(0).default(0),
  plays: z.coerce.number().min(0).default(0),
  reach: z.coerce.number().min(0).default(0),
  count: z.coerce.number().min(1).max(10).default(3),
});

export async function generatePostIdeasAction(
  _prev: GeneratePostIdeasState,
  formData: FormData,
): Promise<GeneratePostIdeasState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = generatePostIdeasSchema.safeParse({
    storeId: formData.get("storeId"),
    caption: formData.get("caption") || undefined,
    hashtags: formData.get("hashtags") || undefined,
    mediaType: formData.get("mediaType"),
    ownerUsername: formData.get("ownerUsername") || undefined,
    likes: formData.get("likes") || 0,
    comments: formData.get("comments") || 0,
    plays: formData.get("plays") || 0,
    reach: formData.get("reach") || 0,
    count: formData.get("count") || 3,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const hashtagList = parsed.data.hashtags
    ? parsed.data.hashtags.split(/\s+/).filter(Boolean)
    : [];

  try {
    const trends = await generatePostIdeas({
      storeId: parsed.data.storeId,
      caption: parsed.data.caption ?? null,
      hashtags: hashtagList,
      mediaType: parsed.data.mediaType,
      metrics: {
        likes: parsed.data.likes,
        comments: parsed.data.comments,
        plays: parsed.data.plays,
        reach: parsed.data.reach,
      },
      ownerUsername: parsed.data.ownerUsername ?? null,
      count: parsed.data.count,
    });
    return { trends };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate ideas" };
  }
}

export interface AskBusinessBrainState {
  error?: string;
  answer?: BusinessBrainAnswer;
}

const askBusinessBrainSchema = z.object({
  question: z.string().min(1).max(2000),
  storeId: z.string().optional(),
});

export async function askBusinessBrainAction(
  _prev: AskBusinessBrainState,
  formData: FormData,
): Promise<AskBusinessBrainState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { error: "You must be signed in to a workspace." };
  }

  const parsed = askBusinessBrainSchema.safeParse({
    question: formData.get("question"),
    storeId: formData.get("storeId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (
    parsed.data.storeId &&
    !(await assertStoreInOrg(user.organizationId, parsed.data.storeId))
  ) {
    return { error: "Store not found in your organization." };
  }

  try {
    const answer = await askBusinessBrain({
      question: parsed.data.question,
      organizationId: user.organizationId,
      userId: user.id,
      storeId: parsed.data.storeId,
    });
    return { answer };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not answer" };
  }
}

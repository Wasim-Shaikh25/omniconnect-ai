"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole, requireVerifiedEmail, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { aiUsageGuard } from "../application/usage-guard";
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
  evidence?: string;
}

/** Ensures the current user's organization owns the target store. */
async function assertStoreInOrg(
  userId: string | null,
  projectId: string,
): Promise<boolean> {
  if (!userId) return false;
  const overview =
    await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function updateAIConfigurationAction(
  _prev: AIActionState,
  formData: FormData,
): Promise<AIActionState> {
  const user = await requireRole("USER");
  await requireVerifiedEmail(user);

  const parsed = updateAIConfigSchema.safeParse({
    projectId: formData.get("projectId"),
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

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await updateAIConfiguration(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/stores/${parsed.data.projectId}`);
  return { ok: true, message: "AI configuration saved." };
}

const generateCaptionsSchema = z.object({
  projectId: z.string().min(1),
  mediaType: z.enum(["POST", "REEL", "STORY"]),
  productTagIds: z.array(z.string()).default([]),
  niche: z.string().optional(),
  goal: z.string().optional(),
});

export async function generateCaptionsAction(
  _prev: GenerateCaptionsState,
  formData: FormData,
): Promise<GenerateCaptionsState> {
  const user = await requireRole("USER");
  await requireVerifiedEmail(user);

  const rawTagIds = formData.getAll("productTagIds");
  const parsed = generateCaptionsSchema.safeParse({
    projectId: formData.get("projectId"),
    mediaType: formData.get("mediaType"),
    productTagIds: rawTagIds.filter((v): v is string => typeof v === "string"),
    niche: formData.get("niche") || undefined,
    goal: formData.get("goal") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  const products = await ecommerceQueries.listProducts(parsed.data.projectId, 100);
  const selected = products.filter((p) => parsed.data.productTagIds.includes(p.id));

  try {
    const captions = await generateCaptions({
      projectId: parsed.data.projectId,
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
  projectId: z.string().min(1),
  niche: z.string().min(1).max(120),
  format: z.enum(["REEL", "POST", "CAROUSEL", "STORY", "ANY"]).optional(),
  count: z.coerce.number().min(1).max(10).optional(),
});

export async function generateTrendsAction(
  _prev: GenerateTrendsState,
  formData: FormData,
): Promise<GenerateTrendsState> {
  const user = await requireRole("USER");
  await requireVerifiedEmail(user);

  const parsed = generateTrendsSchema.safeParse({
    projectId: formData.get("projectId"),
    niche: formData.get("niche"),
    format: formData.get("format") || undefined,
    count: formData.get("count") ? Number(formData.get("count")) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  try {
    const trends = await generateTrends({
      projectId: parsed.data.projectId,
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
  projectId: z.string().min(1),
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
  const user = await requireRole("USER");
  await requireVerifiedEmail(user);

  const parsed = generatePostIdeasSchema.safeParse({
    projectId: formData.get("projectId"),
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

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  const hashtagList = parsed.data.hashtags
    ? parsed.data.hashtags.split(/\s+/).filter(Boolean)
    : [];

  try {
    const { ideas, evidence } = await generatePostIdeas({
      projectId: parsed.data.projectId,
      userId: user.userId ?? undefined,
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
    return { trends: ideas, evidence };
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
  projectId: z.string().optional(),
});

export async function askBusinessBrainAction(
  _prev: AskBusinessBrainState,
  formData: FormData,
): Promise<AskBusinessBrainState> {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return { error: "You must be signed in to a workspace." };
  }
  await requireVerifiedEmail(user);

  const parsed = askBusinessBrainSchema.safeParse({
    question: formData.get("question"),
    projectId: formData.get("projectId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (
    parsed.data.projectId &&
    !(await assertStoreInOrg(user.userId, parsed.data.projectId))
  ) {
    return { error: "Store not found in your organization." };
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  try {
    const answer = await askBusinessBrain({
      question: parsed.data.question,
      userId: user.userId,
      projectId: parsed.data.projectId,
    });
    return { answer };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not answer" };
  }
}

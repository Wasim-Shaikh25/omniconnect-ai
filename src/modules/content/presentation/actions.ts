"use server";

import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import type { TrendIdea } from "@/modules/ai";
import { generateContentIdeas } from "../infrastructure/container";

export interface GenerateContentIdeasState {
  error?: string;
  trends?: TrendIdea[];
  evidence?: string;
}

const generateContentIdeasSchema = z.object({
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

async function assertStoreInOrg(organizationId: string | null, storeId: string): Promise<boolean> {
  if (!organizationId) return false;
  const overview = await organizationQueries.getOrganizationOverview(organizationId);
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

export async function generateContentIdeasAction(
  _prev: GenerateContentIdeasState,
  formData: FormData,
): Promise<GenerateContentIdeasState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = generateContentIdeasSchema.safeParse({
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
    const { ideas, evidence } = await generateContentIdeas({
      storeId: parsed.data.storeId,
      organizationId: user.organizationId ?? undefined,
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
    return { error: error instanceof Error ? error.message : "Could not generate content ideas" };
  }
}

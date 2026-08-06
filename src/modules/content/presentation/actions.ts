"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import type { TrendIdea } from "@/modules/ai";
import { generateContentIdeas, publishMedia } from "../infrastructure/container";

export interface GenerateContentIdeasState {
  error?: string;
  trends?: TrendIdea[];
  evidence?: string;
}

export interface ContentActionState {
  error?: string;
  ok?: boolean;
  message?: string;
  externalId?: string;
}

const generateContentIdeasSchema = z.object({
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

const publishMediaActionSchema = z.object({
  projectId: z.string().min(1),
  caption: z.string().max(2200).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "REEL", "CAROUSEL", "STORY"] as const),
  mediaUrls: z.string().url(),
});

async function assertStoreInOrg(userId: string | null, projectId: string): Promise<boolean> {
  if (!userId) return false;
  const overview = await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function generateContentIdeasAction(
  _prev: GenerateContentIdeasState,
  formData: FormData,
): Promise<GenerateContentIdeasState> {
  const user = await requireRole("USER");

  const parsed = generateContentIdeasSchema.safeParse({
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

  const hashtagList = parsed.data.hashtags
    ? parsed.data.hashtags.split(/\s+/).filter(Boolean)
    : [];

  try {
    const { ideas, evidence } = await generateContentIdeas({
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
    return { error: error instanceof Error ? error.message : "Could not generate content ideas" };
  }
}

export async function publishMediaAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const user = await requireRole("USER");
  const rawMediaUrls = formData.getAll("mediaUrls").map((v) => String(v));
  const parsed = publishMediaActionSchema.safeParse({
    projectId: formData.get("projectId"),
    caption: formData.get("caption") || undefined,
    mediaType: formData.get("mediaType"),
    mediaUrls: rawMediaUrls.length ? rawMediaUrls[0] : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  // Support multiple media URLs submitted as repeated fields.
  const mediaUrls = rawMediaUrls.filter(
    (url) => url.length > 0 && z.string().url().safeParse(url).success,
  );
  if (mediaUrls.length === 0) {
    return { error: "At least one valid media URL is required." };
  }

  try {
    const result = await publishMedia({
      projectId: parsed.data.projectId,
      caption: parsed.data.caption?.trim(),
      mediaType: parsed.data.mediaType,
      mediaUrls,
    });

    if (!result.ok) {
      return { error: result.error.message };
    }

    revalidatePath(`/stores/${parsed.data.projectId}/content`);
    return {
      ok: true,
      message: "Published to Instagram.",
      externalId: result.value.externalId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish media";
    return { error: message };
  }
}

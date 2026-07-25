"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { metaService } from "@/modules/meta/server";
import { analyzeCompetitor } from "@/modules/ai/server";
import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis } from "@/modules/ai";
import type { TrackedAccountRecord, SuggestedCompetitor } from "../application/ports";
import { getMarketingPerformance } from "../infrastructure/container";
import { PrismaTrackedAccountRepository } from "../infrastructure/tracked-account.repository";

const trackedAccountRepository = new PrismaTrackedAccountRepository();

export interface TrackCompetitorState {
  error?: string;
  ok?: boolean;
  account?: TrackedAccountRecord;
}

export interface ListCompetitorsState {
  error?: string;
  accounts?: TrackedAccountRecord[];
}

export interface CompetitorMediaState {
  error?: string;
  media?: MetaMediaItem[];
  accountId?: string;
}

export interface CompetitorAnalysisState {
  error?: string;
  analysis?: CompetitorAnalysis;
  accountId?: string;
}

export interface DiscoverCompetitorsState {
  error?: string;
  query?: string;
  suggestions?: SuggestedCompetitor[];
}

async function assertStoreInOrg(organizationId: string | null, storeId: string): Promise<boolean> {
  if (!organizationId) return false;
  const overview = await organizationQueries.getOrganizationOverview(organizationId);
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

const trackCompetitorSchema = z.object({
  storeId: z.string().min(1),
  handle: z.string().min(1).max(120),
  platform: z.string().max(50).default("INSTAGRAM"),
  niche: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export async function trackCompetitorAction(
  _prev: TrackCompetitorState,
  formData: FormData,
): Promise<TrackCompetitorState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = trackCompetitorSchema.safeParse({
    storeId: formData.get("storeId"),
    handle: formData.get("handle"),
    platform: formData.get("platform") ?? "INSTAGRAM",
    niche: formData.get("niche") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const account = await trackedAccountRepository.create({
      storeId: parsed.data.storeId,
      handle: parsed.data.handle.replace(/^@/, ""),
      platform: parsed.data.platform,
      niche: parsed.data.niche ?? null,
      note: parsed.data.note ?? null,
    });
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/competitors`);
    return { ok: true, account };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not track competitor" };
  }
}

export async function listTrackedCompetitorsAction(storeId: string): Promise<ListCompetitorsState> {
  const user = await requireRole("STORE_OWNER");
  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const accounts = await trackedAccountRepository.listByStore(storeId);
    return { accounts };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load competitors" };
  }
}

const getCompetitorMediaSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
  limit: z.coerce.number().min(1).max(25).default(10),
});

export async function getCompetitorMediaAction(
  _prev: CompetitorMediaState,
  formData: FormData,
): Promise<CompetitorMediaState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = getCompetitorMediaSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
    limit: formData.get("limit") ? Number(formData.get("limit")) : 10,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const account = await trackedAccountRepository.findById(parsed.data.accountId);
  if (!account || account.storeId !== parsed.data.storeId) {
    return { error: "Competitor not found." };
  }

  try {
    const media = await metaService.getCompetitorMedia(parsed.data.storeId, account.handle, { limit: parsed.data.limit });
    await trackedAccountRepository.update(account.id, {
      lastMedia: media,
      lastSyncedAt: new Date(),
    });
    return { media, accountId: account.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not fetch competitor media" };
  }
}

const analyzeCompetitorSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function analyzeCompetitorAction(
  _prev: CompetitorAnalysisState,
  formData: FormData,
): Promise<CompetitorAnalysisState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = analyzeCompetitorSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const account = await trackedAccountRepository.findById(parsed.data.accountId);
  if (!account || account.storeId !== parsed.data.storeId) {
    return { error: "Competitor not found." };
  }

  const posts = account.lastMedia ?? [];
  if (posts.length === 0) {
    return { error: "Fetch competitor posts first before analyzing." };
  }

  try {
    const analysis = await analyzeCompetitor({
      storeId: parsed.data.storeId,
      handle: account.handle,
      niche: account.niche,
      posts,
    });
    await trackedAccountRepository.update(account.id, { lastAnalysis: analysis });
    return { analysis, accountId: account.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not analyze competitor" };
  }
}

const discoverCompetitorsSchema = z.object({
  storeId: z.string().min(1),
  query: z.string().min(1).max(120),
  mediaLimit: z.coerce.number().min(1).max(50).default(25),
  topAccounts: z.coerce.number().min(1).max(20).default(5),
});

export async function discoverCompetitorsAction(
  _prev: DiscoverCompetitorsState,
  formData: FormData,
): Promise<DiscoverCompetitorsState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = discoverCompetitorsSchema.safeParse({
    storeId: formData.get("storeId"),
    query: formData.get("query"),
    mediaLimit: formData.get("mediaLimit") ? Number(formData.get("mediaLimit")) : 25,
    topAccounts: formData.get("topAccounts") ? Number(formData.get("topAccounts")) : 5,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const search = await metaService.searchHashtag(parsed.data.storeId, parsed.data.query);
    const hashtagId = search.hashtagId;
    if (!hashtagId) {
      return { error: "Could not find a hashtag for this niche. Try a more common hashtag." };
    }

    const media = await metaService.getHashtagMedia(parsed.data.storeId, hashtagId, {
      top: true,
      limit: parsed.data.mediaLimit,
    });

    const byHandle = new Map<string, MetaMediaItem[]>();
    for (const item of media) {
      if (!item.ownerUsername) continue;
      const list = byHandle.get(item.ownerUsername) ?? [];
      list.push(item);
      byHandle.set(item.ownerUsername, list);
    }

    const suggestions: SuggestedCompetitor[] = Array.from(byHandle.entries())
      .map(([handle, posts]) => {
        const totalLikes = posts.reduce((sum, p) => sum + (p.metrics.likes ?? 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.metrics.comments ?? 0), 0);
        const postCount = posts.length;
        const sorted = posts
          .slice()
          .sort((a, b) => (b.metrics.likes ?? 0) - (a.metrics.likes ?? 0));
        return {
          handle,
          platform: "INSTAGRAM",
          postCount,
          avgLikes: Math.round(totalLikes / postCount),
          avgComments: Math.round(totalComments / postCount),
          totalLikes,
          totalComments,
          topCaption: sorted[0]?.caption ?? null,
        };
      })
      .sort((a, b) => b.avgLikes - a.avgLikes)
      .slice(0, parsed.data.topAccounts);

    return { query: parsed.data.query, suggestions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not discover competitors" };
  }
}

const deleteTrackedCompetitorSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function deleteTrackedCompetitorAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireRole("STORE_OWNER");
  const parsed = deleteTrackedCompetitorSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const account = await trackedAccountRepository.findById(parsed.data.accountId);
  if (!account || account.storeId !== parsed.data.storeId) {
    return { error: "Competitor not found." };
  }

  try {
    await trackedAccountRepository.delete(account.id);
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/competitors`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not remove competitor" };
  }
}

export interface MarketingPerformanceState {
  error?: string;
  view?: Awaited<ReturnType<typeof getMarketingPerformance>>;
}

const marketingPerformanceSchema = z.object({
  storeId: z.string().min(1),
});

export async function getMarketingPerformanceAction(
  _prev: MarketingPerformanceState,
  formData: FormData,
): Promise<MarketingPerformanceState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = marketingPerformanceSchema.safeParse({
    storeId: formData.get("storeId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }
  if (!user.organizationId) return { error: "Organization not found." };

  try {
    const view = await getMarketingPerformance({
      organizationId: user.organizationId,
      storeId: parsed.data.storeId,
    });
    return { view };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load marketing performance" };
  }
}

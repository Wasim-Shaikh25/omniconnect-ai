"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, getCurrentUser } from "@/modules/auth";
import { organizationQueries, tenantGuard } from "@/modules/organizations";
import { metaService } from "@/modules/meta/server";
import { analyzeCompetitor } from "@/modules/ai/server";
import { aiUsageGuard } from "@/modules/ai";
import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis } from "@/modules/ai";
import type { TrackedAccountRecord, SuggestedCompetitor } from "../application/ports";
import {
  getMarketingPerformance,
  getBestTimeToPostForStore,
  getContentCalendarForStore,
  marketingInsightsService,
  marketingInsightsRepository,
} from "../server";
import { getCompetitorBenchmark } from "../infrastructure/container";
import { makeGetWorkspaceCompetitorComparison } from "../application/competitor-benchmark";
import { PrismaTrackedAccountRepository } from "../infrastructure/tracked-account.repository";

const trackedAccountRepository = new PrismaTrackedAccountRepository();

const getWorkspaceCompetitorComparison = makeGetWorkspaceCompetitorComparison({
  trackedAccounts: trackedAccountRepository,
  getAccountMedia: metaService.getAccountMedia.bind(metaService),
});

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
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { error: "Not authenticated" };

  try {
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch {
    return { error: "Store not found or access denied." };
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
    await aiUsageGuard.assertAvailable(user.organizationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
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
    await trackedAccountRepository.delete(account.id, parsed.data.storeId);
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

export interface CompetitorBenchmarkState {
  error?: string;
  benchmark?: Awaited<ReturnType<typeof getCompetitorBenchmark>>;
}

const competitorBenchmarkSchema = z.object({
  storeId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function getCompetitorBenchmarkAction(
  _prev: CompetitorBenchmarkState,
  formData: FormData,
): Promise<CompetitorBenchmarkState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = competitorBenchmarkSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }
  if (!user.organizationId) return { error: "Organization not found." };

  try {
    const benchmark = await getCompetitorBenchmark({
      organizationId: user.organizationId,
      storeId: parsed.data.storeId,
      accountId: parsed.data.accountId,
    });
    if (!benchmark) return { error: "Competitor not found or no media available." };
    return { benchmark };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load competitor benchmark" };
  }
}

export interface BestTimeToPostState {
  error?: string;
  windows?: Awaited<ReturnType<typeof getBestTimeToPostForStore>>;
}

export interface ContentCalendarState {
  error?: string;
  slots?: Awaited<ReturnType<typeof getContentCalendarForStore>>;
}

export interface WorkspaceCompetitorComparisonState {
  error?: string;
  comparison?: Awaited<ReturnType<typeof getWorkspaceCompetitorComparison>>;
}

export async function getWorkspaceCompetitorComparisonAction(
  _prev: WorkspaceCompetitorComparisonState,
  formData: FormData,
): Promise<WorkspaceCompetitorComparisonState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = competitorBenchmarkSchema.safeParse({
    storeId: formData.get("storeId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }
  if (!user.organizationId) return { error: "Organization not found." };

  try {
    const comparison = await getWorkspaceCompetitorComparison({
      organizationId: user.organizationId,
      storeId: parsed.data.storeId,
      accountId: parsed.data.accountId,
    });
    if (!comparison) return { error: "Competitor not found or no media available." };
    return { comparison };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load workspace comparison" };
  }
}

const bestTimeToPostSchema = z.object({
  storeId: z.string().min(1),
});

export async function getBestTimeToPostAction(
  _prev: BestTimeToPostState,
  formData: FormData,
): Promise<BestTimeToPostState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = bestTimeToPostSchema.safeParse({ storeId: formData.get("storeId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const windows = await getBestTimeToPostForStore(parsed.data.storeId);
    return { windows };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load best times" };
  }
}

const contentCalendarSchema = z.object({
  storeId: z.string().min(1),
});

export async function getContentCalendarAction(
  _prev: ContentCalendarState,
  formData: FormData,
): Promise<ContentCalendarState> {
  const user = await requireRole("STORE_OWNER");
  const parsed = contentCalendarSchema.safeParse({ storeId: formData.get("storeId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const slots = await getContentCalendarForStore(parsed.data.storeId);
    return { slots };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load content calendar" };
  }
}

export interface SyncMediaCatalogState { error?: string; upserted?: number; }
export interface SyncAccountAnalyticsState { error?: string; insight?: Awaited<ReturnType<typeof marketingInsightsService.syncAccountAnalytics>>; }
export interface SearchTrendingHashtagsState { error?: string; snapshotId?: string; }
export interface AnalyzeMediaState { error?: string; analysis?: Awaited<ReturnType<typeof marketingInsightsService.analyzeMediaPost>>; }
export interface GenerateReportState { error?: string; reportId?: string; }
export interface CreateContentRecommendationState { error?: string; recommendationId?: string; }

async function guardStoreAccess(user: Awaited<ReturnType<typeof getCurrentUser>>, storeId: string): Promise<{ error?: string }> {
  if (!user || !user.organizationId) return { error: "Not authenticated" };
  try {
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch {
    return { error: "Store not found or access denied." };
  }
  return {};
}

const storeIdSchema = z.object({ storeId: z.string().min(1) });

export async function syncMediaCatalogAction(_prev: SyncMediaCatalogState, formData: FormData): Promise<SyncMediaCatalogState> {
  const user = await getCurrentUser();
  const parsed = storeIdSchema.safeParse({ storeId: formData.get("storeId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await guardStoreAccess(user, parsed.data.storeId);
  if (guard.error) return guard;

  try {
    const result = await marketingInsightsService.syncMediaCatalog(parsed.data.storeId);
    revalidatePath(`/stores/${parsed.data.storeId}/analytics/content`);
    return { upserted: result.upserted };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not sync media" };
  }
}

export async function syncAccountAnalyticsAction(_prev: SyncAccountAnalyticsState, formData: FormData): Promise<SyncAccountAnalyticsState> {
  const user = await getCurrentUser();
  const parsed = storeIdSchema.safeParse({ storeId: formData.get("storeId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await guardStoreAccess(user, parsed.data.storeId);
  if (guard.error) return guard;

  try {
    const insight = await marketingInsightsService.syncAccountAnalytics(parsed.data.storeId);
    return { insight };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not sync account analytics" };
  }
}

const searchTrendingHashtagsSchema = z.object({
  storeId: z.string().min(1),
  query: z.string().min(1).max(120),
});

export async function searchTrendingHashtagsAction(_prev: SearchTrendingHashtagsState, formData: FormData): Promise<SearchTrendingHashtagsState> {
  const user = await getCurrentUser();
  const parsed = searchTrendingHashtagsSchema.safeParse({
    storeId: formData.get("storeId"),
    query: formData.get("query"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await guardStoreAccess(user, parsed.data.storeId);
  if (guard.error) return guard;

  try {
    const snapshotId = await marketingInsightsService.searchTrendingHashtags(parsed.data.storeId, parsed.data.query);
    revalidatePath(`/stores/${parsed.data.storeId}/analytics/trends`);
    return { snapshotId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not search hashtags" };
  }
}

const analyzeMediaSchema = z.object({
  storeId: z.string().min(1),
  mediaPostId: z.string().min(1),
});

export async function analyzeMediaAction(_prev: AnalyzeMediaState, formData: FormData): Promise<AnalyzeMediaState> {
  const user = await getCurrentUser();
  const parsed = analyzeMediaSchema.safeParse({
    storeId: formData.get("storeId"),
    mediaPostId: formData.get("mediaPostId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await guardStoreAccess(user, parsed.data.storeId);
  if (guard.error) return guard;

  const organizationId = user?.organizationId ? await organizationQueries.getOrganizationIdByStoreId(parsed.data.storeId) : null;
  try {
    await aiUsageGuard.assertAvailable(organizationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  try {
    const analysis = await marketingInsightsService.analyzeMediaPost(parsed.data.storeId, parsed.data.mediaPostId);
    return { analysis };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not analyze media" };
  }
}

const generateReportSchema = z.object({
  storeId: z.string().min(1),
  period: z.enum(["WEEKLY", "MONTHLY"]).default("WEEKLY"),
});

export async function generateReportAction(_prev: GenerateReportState, formData: FormData): Promise<GenerateReportState> {
  const user = await getCurrentUser();
  const parsed = generateReportSchema.safeParse({
    storeId: formData.get("storeId"),
    period: formData.get("period") ?? "WEEKLY",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await guardStoreAccess(user, parsed.data.storeId);
  if (guard.error) return guard;

  try {
    const reportId = await marketingInsightsService.generateReport(parsed.data.storeId, parsed.data.period);
    revalidatePath(`/stores/${parsed.data.storeId}/analytics/reports`);
    return { reportId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate report" };
  }
}

const createContentRecommendationSchema = z.object({
  storeId: z.string().min(1),
  type: z.string().max(50).optional(),
  topic: z.string().max(200).optional(),
});

export async function createContentRecommendationAction(_prev: CreateContentRecommendationState, formData: FormData): Promise<CreateContentRecommendationState> {
  const user = await getCurrentUser();
  const parsed = createContentRecommendationSchema.safeParse({
    storeId: formData.get("storeId"),
    type: formData.get("type") || undefined,
    topic: formData.get("topic") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const guard = await guardStoreAccess(user, parsed.data.storeId);
  if (guard.error) return guard;

  const organizationId = user?.organizationId ? await organizationQueries.getOrganizationIdByStoreId(parsed.data.storeId) : null;
  try {
    await aiUsageGuard.assertAvailable(organizationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI quota exceeded" };
  }

  try {
    const recommendationId = await marketingInsightsService.createContentRecommendation(parsed.data.storeId, {
      type: parsed.data.type,
      topic: parsed.data.topic,
    });
    revalidatePath(`/stores/${parsed.data.storeId}/analytics/recommendations`);
    return { recommendationId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create recommendation" };
  }
}

export interface ListMediaPostsState { error?: string; posts?: Awaited<ReturnType<typeof marketingInsightsRepository.listMediaPosts>>; }
export interface GetMediaPostState { error?: string; post?: Awaited<ReturnType<typeof marketingInsightsRepository.getMediaPostById>>; }
export interface ListTrendSnapshotsState { error?: string; snapshots?: Awaited<ReturnType<typeof marketingInsightsRepository.listTrendSnapshots>>; }
export interface ListContentRecommendationsState { error?: string; recommendations?: Awaited<ReturnType<typeof marketingInsightsRepository.listContentRecommendations>>; }
export interface ListReportsState { error?: string; reports?: Awaited<ReturnType<typeof marketingInsightsRepository.listReports>>; }

export async function listMediaPostsAction(storeId: string): Promise<ListMediaPostsState> {
  const user = await getCurrentUser();
  const guard = await guardStoreAccess(user, storeId);
  if (guard.error) return guard;

  try {
    const posts = await marketingInsightsRepository.listMediaPosts(storeId, { limit: 50 });
    return { posts };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load media posts" };
  }
}

export async function getMediaPostAction(id: string): Promise<GetMediaPostState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const post = await marketingInsightsRepository.getMediaPostById(id);
    if (!post) return { error: "Media post not found" };
    const guard = await guardStoreAccess(user, post.storeId);
    if (guard.error) return guard;
    return { post };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load media post" };
  }
}

export async function listTrendSnapshotsAction(storeId: string, type?: "HASHTAG" | "AUDIO" | "NICHE"): Promise<ListTrendSnapshotsState> {
  const user = await getCurrentUser();
  const guard = await guardStoreAccess(user, storeId);
  if (guard.error) return guard;

  try {
    const snapshots = await marketingInsightsRepository.listTrendSnapshots(storeId, { type, limit: 50 });
    return { snapshots };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load trends" };
  }
}

export async function listContentRecommendationsAction(storeId: string): Promise<ListContentRecommendationsState> {
  const user = await getCurrentUser();
  const guard = await guardStoreAccess(user, storeId);
  if (guard.error) return guard;

  try {
    const recommendations = await marketingInsightsRepository.listContentRecommendations(storeId, 50);
    return { recommendations };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load recommendations" };
  }
}

export async function listReportsAction(storeId: string): Promise<ListReportsState> {
  const user = await getCurrentUser();
  const guard = await guardStoreAccess(user, storeId);
  if (guard.error) return guard;

  try {
    const reports = await marketingInsightsRepository.listReports(storeId, 50);
    return { reports };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load reports" };
  }
}

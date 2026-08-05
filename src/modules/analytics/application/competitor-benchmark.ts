import type { MetaMediaItem } from "@/modules/meta";
import type { EventBus } from "@/shared/events";
import type { TrackedAccountRecord, TrackedAccountRepository } from "./ports";
import { CompetitorBenchmarkReady, CompetitorChangeDetected } from "../domain/events";

export interface CompetitorBenchmark {
  accountId: string;
  handle: string;
  postCount: number;
  postsPerWeek: number;
  reelCount: number;
  reelRatio: number;
  avgHookLength: number;
  avgCaptionLength: number;
  avgEngagement: number;
  totalLikes: number;
  totalComments: number;
  topHashtags: string[];
  audioUsage: number;
  postingConsistencyScore: number;
  suggestions: string[];
}

export interface WorkspaceCompetitorComparison {
  accountId: string;
  handle: string;
  workspace: {
    postCount: number;
    postsPerWeek: number;
    reelRatio: number;
    avgHookLength: number;
    avgCaptionLength: number;
    avgEngagement: number;
    topHashtags: string[];
  };
  competitor: {
    postCount: number;
    postsPerWeek: number;
    reelRatio: number;
    avgHookLength: number;
    avgCaptionLength: number;
    avgEngagement: number;
    topHashtags: string[];
  };
  gaps: string[];
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function firstLine(text: string | null): string {
  if (!text) return "";
  return text.split(/\r?\n/)[0]?.trim() ?? "";
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeBenchmark(account: TrackedAccountRecord): CompetitorBenchmark {
  const posts = (account.lastMedia as MetaMediaItem[] | null) ?? [];
  const withDate = posts
    .filter((p): p is MetaMediaItem & { publishedAt: Date } => p.publishedAt !== null)
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());

  const postCount = posts.length;
  const daysSpan =
    withDate.length >= 2
      ? daysBetween(withDate[0].publishedAt, withDate[withDate.length - 1].publishedAt)
      : 0;
  const postsPerWeek = daysSpan > 0 ? (postCount / daysSpan) * 7 : 0;

  const reelCount = posts.filter((p) => p.mediaType === "REEL").length;
  const reelRatio = postCount > 0 ? reelCount / postCount : 0;

  const hooks = posts.map((p) => firstLine(p.caption));
  const avgHookLength =
    postCount > 0 ? hooks.reduce((sum, h) => sum + h.length, 0) / postCount : 0;
  const avgCaptionLength =
    postCount > 0
      ? posts.reduce((sum, p) => sum + (p.caption?.length ?? 0), 0) / postCount
      : 0;

  const totalLikes = posts.reduce((sum, p) => sum + (p.metrics.likes ?? 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.metrics.comments ?? 0), 0);
  const avgEngagement = postCount > 0 ? (totalLikes + totalComments) / postCount : 0;

  const hashtagCounts: Record<string, number> = {};
  for (const p of posts) {
    for (const h of p.hashtags) {
      hashtagCounts[h] = (hashtagCounts[h] ?? 0) + 1;
    }
  }
  const topHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  const intervals: number[] = [];
  for (let i = 1; i < withDate.length; i++) {
    intervals.push(daysBetween(withDate[i - 1].publishedAt, withDate[i].publishedAt));
  }
  const consistency =
    intervals.length > 0 ? 1 / (1 + standardDeviation(intervals)) : 0;

  const suggestions: string[] = [];
  if (postsPerWeek < 2) {
    suggestions.push("Competitor posts less than twice per week — increase posting frequency to capture more share of voice.");
  }
  if (reelRatio < 0.3) {
    suggestions.push("Competitor's Reel share is low. Reels currently drive the highest reach on Instagram.");
  }
  if (avgHookLength > 60) {
    suggestions.push("Competitor hooks are long. Shorter, scroll-stopping first lines often improve retention.");
  }
  if (avgEngagement < 50) {
    suggestions.push("Competitor engagement per post is modest. Strong CTAs and quick comment replies can close the gap.");
  }
  if (topHashtags.length > 0) {
    suggestions.push(`Top competitor hashtags: ${topHashtags.map((h) => `#${h}`).join(", ")}.`);
  }
  if (suggestions.length === 0) {
    suggestions.push("Competitor benchmark looks balanced. Differentiate with stronger product CTAs and community engagement.");
  }

  return {
    accountId: account.id,
    handle: account.handle,
    postCount,
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    reelCount,
    reelRatio: Math.round(reelRatio * 100),
    avgHookLength: Math.round(avgHookLength),
    avgCaptionLength: Math.round(avgCaptionLength),
    avgEngagement: Math.round(avgEngagement),
    totalLikes,
    totalComments,
    topHashtags,
    audioUsage: 0,
    postingConsistencyScore: Math.round(consistency * 100),
    suggestions,
  };
}

export interface GetCompetitorBenchmarkInput {
  organizationId: string;
  storeId: string;
  accountId: string;
}

export function makeGetCompetitorBenchmark(deps: {
  trackedAccounts: TrackedAccountRepository;
  eventBus: EventBus;
}) {
  return async function getCompetitorBenchmark(
    input: GetCompetitorBenchmarkInput,
  ): Promise<CompetitorBenchmark | null> {
    const account = await deps.trackedAccounts.findById(input.accountId);
    if (!account || account.storeId !== input.storeId) return null;

    const previousMedia = account.lastMedia as MetaMediaItem[] | null;
    const benchmark = computeBenchmark(account);

    const now = new Date();
    if (previousMedia && previousMedia.length !== benchmark.postCount) {
      await deps.eventBus.publish(
        new CompetitorChangeDetected(input.storeId, {
          organizationId: input.organizationId,
          storeId: input.storeId,
          accountId: account.id,
          handle: account.handle,
          previousPostCount: previousMedia.length,
          currentPostCount: benchmark.postCount,
          detectedAt: now,
        }),
      );
    }

    await deps.eventBus.publish(
      new CompetitorBenchmarkReady(input.storeId, {
        organizationId: input.organizationId,
        storeId: input.storeId,
        accountId: account.id,
        handle: account.handle,
        generatedAt: now,
      }),
    );

    return benchmark;
  };
}

export type GetCompetitorBenchmark = ReturnType<typeof makeGetCompetitorBenchmark>;

function workspaceMetricsFromMedia(posts: MetaMediaItem[]): WorkspaceCompetitorComparison["workspace"] {
  const withDate = posts
    .filter((p): p is MetaMediaItem & { publishedAt: Date } => p.publishedAt !== null)
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());

  const postCount = posts.length;
  const daysSpan =
    withDate.length >= 2 ? daysBetween(withDate[0].publishedAt, withDate[withDate.length - 1].publishedAt) : 0;
  const postsPerWeek = daysSpan > 0 ? (postCount / daysSpan) * 7 : 0;

  const reelCount = posts.filter((p) => p.mediaType === "REEL").length;
  const reelRatio = postCount > 0 ? reelCount / postCount : 0;

  const hooks = posts.map((p) => firstLine(p.caption));
  const avgHookLength = postCount > 0 ? hooks.reduce((sum, h) => sum + h.length, 0) / postCount : 0;
  const avgCaptionLength =
    postCount > 0 ? posts.reduce((sum, p) => sum + (p.caption?.length ?? 0), 0) / postCount : 0;

  const totalLikes = posts.reduce((sum, p) => sum + (p.metrics.likes ?? 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.metrics.comments ?? 0), 0);
  const avgEngagement = postCount > 0 ? (totalLikes + totalComments) / postCount : 0;

  const hashtagCounts: Record<string, number> = {};
  for (const p of posts) {
    for (const h of p.hashtags) {
      hashtagCounts[h] = (hashtagCounts[h] ?? 0) + 1;
    }
  }
  const topHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return {
    postCount,
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    reelRatio: Math.round(reelRatio * 100),
    avgHookLength: Math.round(avgHookLength),
    avgCaptionLength: Math.round(avgCaptionLength),
    avgEngagement: Math.round(avgEngagement),
    topHashtags,
  };
}

function comparisonGaps(workspace: WorkspaceCompetitorComparison["workspace"], competitor: WorkspaceCompetitorComparison["competitor"]): string[] {
  const gaps: string[] = [];
  if (workspace.postsPerWeek < competitor.postsPerWeek * 0.8) {
    gaps.push(`You post ${workspace.postsPerWeek}/week vs competitor ${competitor.postsPerWeek}/week — increase frequency.`);
  }
  if (workspace.reelRatio < competitor.reelRatio * 0.8) {
    gaps.push(`Your Reel ratio is ${workspace.reelRatio}% vs competitor ${competitor.reelRatio}% — add more Reels.`);
  }
  if (workspace.avgHookLength > competitor.avgHookLength * 1.5) {
    gaps.push(`Your hooks average ${workspace.avgHookLength} chars vs competitor ${competitor.avgHookLength} — try shorter openers.`);
  }
  if (workspace.avgEngagement < competitor.avgEngagement * 0.8) {
    gaps.push(`Your engagement per post is ${workspace.avgEngagement} vs competitor ${competitor.avgEngagement} — test stronger CTAs and replies.`);
  }
  if (workspace.topHashtags.length === 0 && competitor.topHashtags.length > 0) {
    gaps.push(`Competitor is using ${competitor.topHashtags.slice(0, 5).map((h) => `#${h}`).join(", ")}; review your hashtag strategy.`);
  }
  if (gaps.length === 0) {
    gaps.push("Your page is competitive on these metrics. Keep testing new content formats to stay ahead.");
  }
  return gaps;
}

export interface GetWorkspaceCompetitorComparisonInput {
  organizationId: string;
  storeId: string;
  accountId: string;
}

export function makeGetWorkspaceCompetitorComparison(deps: {
  trackedAccounts: TrackedAccountRepository;
  getAccountMedia: (storeId: string, limit?: number) => Promise<MetaMediaItem[]>;
}) {
  return async function getWorkspaceCompetitorComparison(
    input: GetWorkspaceCompetitorComparisonInput,
  ): Promise<WorkspaceCompetitorComparison | null> {
    const account = await deps.trackedAccounts.findById(input.accountId);
    if (!account || account.storeId !== input.storeId) return null;

    const [workspacePosts, competitorPosts] = await Promise.all([
      deps.getAccountMedia(input.storeId, 25),
      Promise.resolve((account.lastMedia as MetaMediaItem[] | null) ?? []),
    ]);

    const workspace = workspaceMetricsFromMedia(workspacePosts);
    const competitor = workspaceMetricsFromMedia(competitorPosts);
    const gaps = comparisonGaps(workspace, competitor);

    return {
      accountId: account.id,
      handle: account.handle,
      workspace,
      competitor,
      gaps,
    };
  };
}

export type GetWorkspaceCompetitorComparison = ReturnType<typeof makeGetWorkspaceCompetitorComparison>;

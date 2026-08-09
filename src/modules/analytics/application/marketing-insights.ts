import { metaService } from "@/modules/meta/server";
import { analyzeMedia, analyzeTrendingReels, createContentIdea } from "@/modules/ai/ai-services";
import { organizationQueries } from "@/modules/workspaces";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { MetaMediaItem, MetaMediaMetrics } from "@/modules/meta";
import type {
  MarketingInsightsRepository,
  UpsertMediaInsightInput,
} from "./ports";
import type { MediaPost, MediaInsight, MediaAnalysis, AccountInsight, TrendSnapshot } from "../domain/types";
import {
  AccountAnalyticsSynced,
  MediaAnalyticsSynced,
  TrendingHashtagDiscovered,
  ReportGenerated,
  ContentRecommendationCreated,
  TrendingReelsAnalyzed,
} from "../domain/events";

function mapMediaType(item: MetaMediaItem): MediaPost["mediaType"] {
  if (item.mediaType === "REEL" || item.mediaProductType === "REELS") return "REEL";
  if (item.mediaProductType === "STORIES") return "STORY";
  if (item.mediaProductType === "LIVE") return "LIVE";
  if (item.mediaType === "CAROUSEL") return "CAROUSEL";
  return "POST";
}

function mapMetricsToInsightInput(metrics: MetaMediaMetrics): UpsertMediaInsightInput {
  return {
    impressions: metrics.impressions ?? null,
    reach: metrics.reach ?? null,
    likes: metrics.likes ?? null,
    comments: metrics.comments ?? null,
    shares: metrics.shares ?? null,
    saves: metrics.saved ?? null,
    plays: metrics.plays ?? null,
    views: metrics.videoViews ?? metrics.crosspostedViews ?? null,
    engagementRate: metrics.engagement ?? null,
    storyExits: metrics.storyExits ?? null,
    storyRepliesCount: metrics.storyRepliesCount ?? null,
    storyTapsForward: metrics.storyTapsForward ?? null,
    storyTapsBack: metrics.storyTapsBack ?? null,
  };
}

function calculateEngagementRate(insight: Pick<MediaInsight, "likes" | "comments" | "shares" | "saves" | "reach" | "impressions">): number | null {
  const interactions = (insight.likes ?? 0) + (insight.comments ?? 0) + (insight.shares ?? 0) + (insight.saves ?? 0);
  const reach = insight.reach ?? insight.impressions ?? 0;
  if (reach <= 0) return null;
  return Math.round((interactions / reach) * 10000) / 10000;
}

export interface MakeMarketingInsightsServiceDeps {
  repository: MarketingInsightsRepository;
}

export function makeMarketingInsightsService(deps: MakeMarketingInsightsServiceDeps) {
  const repo = deps.repository;

  return {
    async syncMediaCatalog(projectId: string): Promise<{ upserted: number }> {
      // Paginates through the Graph API's cursor-based media feed rather than
      // stopping at the first 25-item page; capped to bound Graph API call volume
      // against the 200 calls/hour per-project rate limit (each post also costs an
      // insights call). Stories are fetched separately; expired/inaccessible
      // story insights are tolerated so one bad story does not fail the whole sync.
      const [feedItems, storyItems] = await Promise.all([
        metaService.getAccountMedia(projectId, 100),
        metaService.getAccountStories(projectId, 25),
      ]);

      const upsertOne = async (item: MetaMediaItem) => {
        const post = await repo.upsertMediaPost(projectId, {
          trackedAccountId: null,
          externalId: item.externalId,
          platform: item.platform,
          mediaType: mapMediaType(item),
          permalink: item.permalink,
          caption: item.caption,
          hashtags: item.hashtags,
          audioId: null,
          audioName: null,
          // Meta only returns thumbnail_url for video-like media; images/carousels
          // only have media_url, so fall back to it as the display image.
          thumbnailUrl: item.thumbnailUrl ?? item.mediaUrl,
          publishedAt: item.publishedAt,
        });

        const insightInput = mapMetricsToInsightInput(item.metrics);
        insightInput.engagementRate =
          insightInput.engagementRate ?? calculateEngagementRate(insightInput as unknown as Pick<MediaInsight, "likes" | "comments" | "shares" | "saves" | "reach" | "impressions">);
        await repo.upsertMediaInsight(post.id, insightInput);

        await eventBus.publish(
          new MediaAnalyticsSynced(projectId, { mediaPostId: post.id, externalId: post.externalId, fetchedAt: new Date() }),
        );
      };

      let upserted = 0;
      for (const item of [...feedItems, ...storyItems]) {
        try {
          await upsertOne(item);
          upserted += 1;
        } catch (error) {
          logger.warn("marketingInsights.syncMediaCatalog.itemFailed", {
            projectId,
            externalId: item.externalId,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }
      return { upserted };
    },

    async syncAccountAnalytics(projectId: string): Promise<AccountInsight | null> {
      const [page, audience] = await Promise.all([
        metaService.getPageInsights(projectId, 1).catch(() => null),
        metaService.getAudienceInsights(projectId).catch(() => null),
      ]);
      if (!page && !audience) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const insight = await repo.upsertAccountInsight(projectId, {
        date: today,
        followers: page?.followers ?? null,
        profileViews: page?.profileViews ?? null,
        reach: page?.reach ?? null,
        impressions: page?.impressions ?? null,
        websiteClicks: page?.websiteClicks ?? null,
        biography: page?.biography ?? null,
        profilePictureUrl: page?.profilePictureUrl ?? null,
        audienceJson: audience ? { demographics: audience.demographics } : null,
      });

      await eventBus.publish(new AccountAnalyticsSynced(projectId, { date: today, fetchedAt: new Date() }));
      return insight;
    },

    async searchTrendingHashtags(projectId: string, query: string): Promise<AccountInsight["id"]> {
      const { hashtagId, userId } = await metaService.searchHashtag(projectId, query);
      const items = hashtagId ? await metaService.getHashtagMedia(projectId, hashtagId, { top: true, limit: 10 }) : [];

      const snapshot = await repo.createTrendSnapshot(projectId, {
        type: "HASHTAG",
        query,
        data: {
          hashtagId,
          userId,
          topMedia: items.map((m) => ({
            externalId: m.externalId,
            mediaType: m.mediaType,
            caption: m.caption,
            permalink: m.permalink,
            metrics: m.metrics,
          })),
        },
      });

      await eventBus.publish(new TrendingHashtagDiscovered(projectId, { query, fetchedAt: new Date() }));
      return snapshot.id;
    },

    async analyzeTrendingReels(projectId: string, query: string): Promise<TrendSnapshot["id"]> {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const reels = await repo.listMediaPosts(projectId, { mediaType: "REEL", since, limit: 50 });
      if (reels.length === 0) {
        throw new Error("No recent Reels found. Sync your media catalog first.");
      }

      const analysis = await analyzeTrendingReels({
        projectId,
        query,
        reels: reels.map((r) => ({
          externalId: r.externalId,
          caption: r.caption,
          mediaType: r.mediaType,
          hashtags: r.hashtags,
          audioName: r.audioName,
          publishedAt: r.publishedAt?.toISOString() ?? null,
          likes: r.latestInsight?.likes ?? null,
          comments: r.latestInsight?.comments ?? null,
          plays: r.latestInsight?.plays ?? null,
          views: r.latestInsight?.views ?? null,
          engagementRate: r.latestInsight?.engagementRate ?? null,
        })),
      });

      const snapshot = await repo.createTrendSnapshot(projectId, {
        type: "NICHE",
        query,
        data: {
          reelCount: reels.length,
          ...analysis,
        },
      });

      for (const rec of analysis.recommendations.slice(0, 3)) {
        await repo.createContentRecommendation(projectId, {
          type: "REEL",
          title: rec.title,
          outline: rec.outline,
          hashtags: rec.hashtags,
          audioSuggestion: rec.audioSuggestion,
          basedOnMediaIds: reels.slice(0, 5).map((r) => r.id),
        });
      }

      await eventBus.publish(
        new TrendingReelsAnalyzed(projectId, { query, snapshotId: snapshot.id, generatedAt: new Date() }),
      );
      return snapshot.id;
    },

    async analyzeMediaPost(projectId: string, mediaPostId: string): Promise<MediaAnalysis> {
      const post = await repo.getMediaPostById(mediaPostId);
      if (!post || post.projectId !== projectId) {
        throw new Error("Media post not found.");
      }
      const insight = post.latestInsight;
      const userId = await organizationQueries.getOrganizationIdByStoreId(projectId);
      if (!userId) throw new Error("Organization not found.");

      const [allPosts] = await Promise.all([
        repo.listMediaPosts(projectId, { limit: 50 }),
      ]);

      const baseline = allPosts
        .filter((p) => p.id !== mediaPostId && p.latestInsight)
        .map((p) => {
          const i = p.latestInsight!;
          return {
            id: p.id,
            mediaType: p.mediaType,
            caption: p.caption,
            hashtags: p.hashtags,
            likes: i.likes ?? null,
            comments: i.comments ?? null,
            shares: i.shares ?? null,
            saves: i.saves ?? null,
            plays: i.plays ?? null,
            views: i.views ?? null,
            reach: i.reach ?? null,
            impressions: i.impressions ?? null,
            engagementRate: i.engagementRate ?? null,
          };
        });

      return analyzeMedia({
        projectId,
        mediaPostId,
        media: {
          id: post.id,
          mediaType: post.mediaType,
          caption: post.caption,
          hashtags: post.hashtags,
          likes: insight?.likes ?? null,
          comments: insight?.comments ?? null,
          shares: insight?.shares ?? null,
          saves: insight?.saves ?? null,
          plays: insight?.plays ?? null,
          views: insight?.views ?? null,
          reach: insight?.reach ?? null,
          impressions: insight?.impressions ?? null,
          engagementRate: insight?.engagementRate ?? null,
        },
        baseline,
      });
    },

    async generateReport(projectId: string, period: "WEEKLY" | "MONTHLY"): Promise<AccountInsight["id"]> {
      const [posts, latestAccountInsight, recommendations] = await Promise.all([
        repo.listMediaPosts(projectId, { limit: 25 }),
        repo.getLatestAccountInsight(projectId),
        repo.listContentRecommendations(projectId, 10),
      ]);

      const topPosts = posts
        .filter((p) => p.latestInsight?.engagementRate !== null)
        .sort((a, b) => (b.latestInsight?.engagementRate ?? 0) - (a.latestInsight?.engagementRate ?? 0))
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          externalId: p.externalId,
          mediaType: p.mediaType,
          engagementRate: p.latestInsight?.engagementRate ?? null,
        }));

      const report = await repo.createReport(projectId, {
        period,
        content: {
          generatedAt: new Date().toISOString(),
          accountSnapshot: latestAccountInsight,
          topPosts,
          recommendations: recommendations.slice(0, 5),
          summary: `Report generated with ${posts.length} media posts and ${recommendations.length} recommendations.`,
        },
      });

      await eventBus.publish(new ReportGenerated(projectId, { reportId: report.id, type: period, generatedAt: new Date() }));
      return report.id;
    },

    async createContentRecommendation(projectId: string, input: { type?: string; topic?: string }): Promise<MediaPost["id"]> {
      const posts = await repo.listMediaPosts(projectId, { limit: 10 });
      const idea = await createContentIdea({
        projectId,
        type: input.type,
        topic: input.topic,
        basedOnMedia: posts.map((p) => ({ id: p.id, caption: p.caption, mediaType: p.mediaType })),
      });

      const recommendation = await repo.createContentRecommendation(projectId, {
        type: input.type ?? "REEL",
        title: idea.title,
        outline: idea.outline,
        hashtags: idea.hashtags,
        audioSuggestion: idea.audioSuggestion,
        basedOnMediaIds: idea.basedOnMediaIds,
      });

      await eventBus.publish(
        new ContentRecommendationCreated(projectId, { recommendationId: recommendation.id, generatedAt: new Date() }),
      );
      return recommendation.id;
    },
  };
}

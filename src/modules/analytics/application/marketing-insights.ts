import { metaService } from "@/modules/meta/server";
import { analyzeMedia, createContentIdea } from "@/modules/ai/server";
import { organizationQueries } from "@/modules/organizations";
import { eventBus } from "@/shared/events";
import type { MetaMediaItem, MetaMediaMetrics } from "@/modules/meta";
import type {
  MarketingInsightsRepository,
  UpsertMediaInsightInput,
} from "./ports";
import type { MediaPost, MediaInsight, MediaAnalysis, AccountInsight } from "../domain/types";
import {
  AccountAnalyticsSynced,
  MediaAnalyticsSynced,
  TrendingHashtagDiscovered,
  ReportGenerated,
  ContentRecommendationCreated,
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
    async syncMediaCatalog(storeId: string): Promise<{ upserted: number }> {
      const items = await metaService.getAccountMedia(storeId, 25);
      let upserted = 0;
      for (const item of items) {
        const post = await repo.upsertMediaPost(storeId, {
          trackedAccountId: null,
          externalId: item.externalId,
          platform: item.platform,
          mediaType: mapMediaType(item),
          permalink: item.permalink,
          caption: item.caption,
          hashtags: item.hashtags,
          audioId: null,
          audioName: null,
          thumbnailUrl: item.thumbnailUrl,
          publishedAt: item.publishedAt,
        });

        const insightInput = mapMetricsToInsightInput(item.metrics);
        insightInput.engagementRate =
          insightInput.engagementRate ?? calculateEngagementRate(insightInput as unknown as Pick<MediaInsight, "likes" | "comments" | "shares" | "saves" | "reach" | "impressions">);
        await repo.upsertMediaInsight(post.id, insightInput);

        await eventBus.publish(
          new MediaAnalyticsSynced(storeId, { mediaPostId: post.id, externalId: post.externalId, fetchedAt: new Date() }),
        );
        upserted += 1;
      }
      return { upserted };
    },

    async syncAccountAnalytics(storeId: string): Promise<AccountInsight | null> {
      const [page, audience] = await Promise.all([
        metaService.getPageInsights(storeId, 1).catch(() => null),
        metaService.getAudienceInsights(storeId).catch(() => null),
      ]);
      if (!page && !audience) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const insight = await repo.upsertAccountInsight(storeId, {
        date: today,
        followers: page?.followers ?? null,
        profileViews: page?.profileViews ?? null,
        reach: page?.reach ?? null,
        impressions: page?.impressions ?? null,
        websiteClicks: null,
        audienceJson: audience ? { demographics: audience.demographics } : null,
      });

      await eventBus.publish(new AccountAnalyticsSynced(storeId, { date: today, fetchedAt: new Date() }));
      return insight;
    },

    async searchTrendingHashtags(storeId: string, query: string): Promise<AccountInsight["id"]> {
      const { hashtagId, userId } = await metaService.searchHashtag(storeId, query);
      const items = hashtagId ? await metaService.getHashtagMedia(storeId, hashtagId, { top: true, limit: 10 }) : [];

      const snapshot = await repo.createTrendSnapshot(storeId, {
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

      await eventBus.publish(new TrendingHashtagDiscovered(storeId, { query, fetchedAt: new Date() }));
      return snapshot.id;
    },

    async analyzeMediaPost(storeId: string, mediaPostId: string): Promise<MediaAnalysis> {
      const post = await repo.getMediaPostById(mediaPostId);
      if (!post || post.storeId !== storeId) {
        throw new Error("Media post not found.");
      }
      const insight = post.latestInsight;
      const organizationId = await organizationQueries.getOrganizationIdByStoreId(storeId);
      if (!organizationId) throw new Error("Organization not found.");

      return analyzeMedia({
        storeId,
        mediaPostId,
        media: {
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
      });
    },

    async generateReport(storeId: string, period: "WEEKLY" | "MONTHLY"): Promise<AccountInsight["id"]> {
      const [posts, latestAccountInsight, recommendations] = await Promise.all([
        repo.listMediaPosts(storeId, { limit: 25 }),
        repo.getLatestAccountInsight(storeId),
        repo.listContentRecommendations(storeId, 10),
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

      const report = await repo.createReport(storeId, {
        period,
        content: {
          generatedAt: new Date().toISOString(),
          accountSnapshot: latestAccountInsight,
          topPosts,
          recommendations: recommendations.slice(0, 5),
          summary: `Report generated with ${posts.length} media posts and ${recommendations.length} recommendations.`,
        },
      });

      await eventBus.publish(new ReportGenerated(storeId, { reportId: report.id, type: period, generatedAt: new Date() }));
      return report.id;
    },

    async createContentRecommendation(storeId: string, input: { type?: string; topic?: string }): Promise<MediaPost["id"]> {
      const posts = await repo.listMediaPosts(storeId, { limit: 10 });
      const idea = await createContentIdea({
        storeId,
        type: input.type,
        topic: input.topic,
        basedOnMedia: posts.map((p) => ({ id: p.id, caption: p.caption, mediaType: p.mediaType })),
      });

      const recommendation = await repo.createContentRecommendation(storeId, {
        type: input.type ?? "REEL",
        title: idea.title,
        outline: idea.outline,
        hashtags: idea.hashtags,
        audioSuggestion: idea.audioSuggestion,
        basedOnMediaIds: idea.basedOnMediaIds,
      });

      await eventBus.publish(
        new ContentRecommendationCreated(storeId, { recommendationId: recommendation.id, generatedAt: new Date() }),
      );
      return recommendation.id;
    },
  };
}

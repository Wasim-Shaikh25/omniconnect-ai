import { describe, it, expect } from "vitest";
import { makeGenerateTrends } from "./generate-trends";
import type { AIProvider } from "./ports";
import type { BestTimeWindow, MediaPost } from "@/modules/analytics/pure";
import type { OrderRecord } from "@/modules/ecommerce";
import { defaultAIConfigurationRecord } from "./ai-config";

const fakeProvider: AIProvider = {
  async complete(_messages, config) {
    return (
      config.fallback ??
      JSON.stringify([
        {
          title: "Trend A",
          format: "REEL",
          hook: "Hook",
          description: "Desc",
          whyItWorks: "Why",
          hashtags: ["#a"],
          audioSuggestion: "audio",
          predictedEngagementScore: 999,
          bestTimeToPost: "wrong",
          cta: "cta",
        },
      ])
    );
  },
};

const fakeConfigRepo = {
  async getByStore() {
    return null;
  },
  async getOrCreateDefault(projectId: string) {
    return defaultAIConfigurationRecord(projectId);
  },
  async update(projectId: string) {
    return this.getOrCreateDefault(projectId);
  },
};

function makePost(id: string, likes: number, publishedAt: Date): MediaPost {
  return {
    id,
    projectId: "p1",
    trackedAccountId: null,
    externalId: id,
    platform: "INSTAGRAM",
    mediaType: "POST",
    permalink: null,
    caption: null,
    hashtags: [],
    audioId: null,
    audioName: null,
    thumbnailUrl: null,
    publishedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    latestInsight: {
      id: `${id}-i`,
      mediaPostId: id,
      impressions: null,
      reach: null,
      likes,
      comments: 0,
      shares: 0,
      saves: 0,
      plays: 0,
      views: 0,
      engagementRate: null,
      storyExits: null,
      storyRepliesCount: null,
      storyTapsForward: null,
      storyTapsBack: null,
      fetchedAt: new Date(),
    },
  } as MediaPost;
}

function makeOrder(total: number, orderDate: Date): OrderRecord {
  return {
    id: "o1",
    externalId: "o1",
    projectId: "p1",
    total,
    currency: null,
    orderDate,
    couponCode: null,
    customerRef: null,
    customerEmail: null,
    attributedMediaId: null,
    attributionSource: null,
    isFirstTimeCustomer: false,
    syncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("makeGenerateTrends", () => {
  it("overrides LLM-invented numbers with deterministic values", async () => {
    const bestWindow: BestTimeWindow = {
      dayOfWeek: "Tuesday",
      hour: 11,
      label: "Tuesday 11:00 UTC",
      engagementScore: 120,
      revenueScore: 80,
      compositeScore: 200,
      postCount: 5,
      orderCount: 2,
    };
    const baseDate = new Date("2026-08-05T11:00:00Z"); // Tuesday
    const posts = [
      makePost("p1", 10, baseDate),
      makePost("p2", 100, baseDate),
      makePost("p3", 50, baseDate),
    ];
    const orders = [makeOrder(99, baseDate), makeOrder(101, baseDate)];

    const generateTrends = makeGenerateTrends({
      aiProvider: fakeProvider,
      aiConfigurationRepository: fakeConfigRepo,
      getBestTimeToPostForStore: async () => [bestWindow],
      listMediaPosts: async () => posts,
      listOrders: async () => orders,
    });

    const trends = await generateTrends({ projectId: "p1", niche: "test", count: 2 });
    expect(trends.length).toBe(2);
    const trend = trends[0];
    // predictedEngagementScore should be deterministic (percentile of median top-2 score vs all scores)
    expect(trend.predictedEngagementScore).toBeGreaterThan(0);
    expect(trend.predictedEngagementScore).toBeLessThanOrEqual(100);
    // The fake provider returned 999 and "wrong"; these should be replaced.
    expect(trend.predictedEngagementScore).not.toBe(999);
    expect(trend.bestTimeToPost).toBe("Tuesday 11:00 UTC");
    expect(trend.predictedRevenue).toBe(100); // median of [99, 101]
    expect(trend.basedOnMediaIds).toEqual(expect.arrayContaining(["p2", "p3"]));
  });

  it("falls back gracefully when data sources fail", async () => {
    const generateTrends = makeGenerateTrends({
      aiProvider: fakeProvider,
      aiConfigurationRepository: fakeConfigRepo,
      getBestTimeToPostForStore: async () => { throw new Error("fail"); },
      listMediaPosts: async () => { throw new Error("fail"); },
      listOrders: async () => { throw new Error("fail"); },
    });

    const trends = await generateTrends({ projectId: "p1", niche: "test" });
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0].bestTimeToPost).toBeTruthy();
    expect(trends[0].predictedEngagementScore).toBe(50);
    expect(trends[0].predictedRevenue).toBeNull();
  });
});

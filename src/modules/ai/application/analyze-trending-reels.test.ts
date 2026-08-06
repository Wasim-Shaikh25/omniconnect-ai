import { describe, it, expect } from "vitest";
import { makeAnalyzeTrendingReels } from "./analyze-trending-reels";
import type { AIProvider } from "./ports";
import type { TrendingReelInput } from "./analyze-trending-reels";
import { defaultAIConfigurationRecord } from "./ai-config";

const fakeProvider: AIProvider = {
  async complete() {
    return JSON.stringify({
      query: "small business",
      summary: "Short, energetic Reels with clear hooks dominate this niche.",
      patterns: ["Fast 3-second hook", "Text-on-screen narration"],
      topHashtags: ["#reels", "#smallbusiness"],
      audioSuggestions: ["Trending upbeat pop"],
      bestTimeToPost: "Tuesday, 7:00 PM EST",
      recommendations: [
        {
          title: "Hook in 3 Seconds",
          outline: "Start with a bold question and deliver the payoff fast.",
          hashtags: ["#reels", "#smallbusiness"],
          audioSuggestion: "Trending upbeat pop",
        },
      ],
    });
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

function makeReel(id: string): TrendingReelInput {
  return {
    externalId: id,
    caption: `Reel ${id}`,
    mediaType: "REEL",
    hashtags: ["#reels"],
    audioName: "trending audio",
    publishedAt: new Date().toISOString(),
    likes: 100,
    comments: 10,
    plays: 1000,
    views: 1200,
    engagementRate: 0.05,
  };
}

describe("makeAnalyzeTrendingReels", () => {
  it("returns a parsed analysis from the AI provider", async () => {
    const analyze = makeAnalyzeTrendingReels({
      aiProvider: fakeProvider,
      aiConfigurationRepository: fakeConfigRepo,
    });

    const result = await analyze({
      projectId: "p1",
      query: "small business",
      reels: [makeReel("r1"), makeReel("r2")],
    });

    expect(result.query).toBe("small business");
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.topHashtags.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]?.title).toBeTruthy();
  });

  it("falls back when the provider returns invalid JSON", async () => {
    const analyze = makeAnalyzeTrendingReels({
      aiProvider: {
        async complete() {
          return "not json";
        },
      },
      aiConfigurationRepository: fakeConfigRepo,
    });

    const result = await analyze({
      projectId: "p1",
      query: "small business",
      reels: [makeReel("r1")],
    });

    expect(result.query).toBe("small business");
    expect(result.summary).toBe("not json".slice(0, 240));
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

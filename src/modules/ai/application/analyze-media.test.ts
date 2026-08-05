import { describe, it, expect } from "vitest";
import { makeAnalyzeMedia } from "./analyze-media";
import type { AIProvider } from "./ports";
import { defaultAIConfigurationRecord } from "./ai-config";

const fakeProvider: AIProvider = {
  async complete(_messages, config) {
    return (
      config.fallback ??
      JSON.stringify({
        whyItWorked: "Narration",
        slideBySlideStoryboard: [{ slide: 1, visual: "v", caption: "c" }],
        suggestedImprovements: ["a"],
      })
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

function media(overrides: Record<string, unknown> = {}) {
  return {
    mediaType: "REEL",
    caption: "caption",
    hashtags: ["#test"],
    likes: 10,
    comments: 2,
    shares: 1,
    saves: 0,
    plays: 100,
    views: 200,
    reach: 50,
    impressions: 60,
    engagementRate: 0.05,
    ...overrides,
  };
}

describe("makeAnalyzeMedia", () => {
  it("computes deterministic percentile and z-score when baseline is provided", async () => {
    const analyze = makeAnalyzeMedia({ aiProvider: fakeProvider, aiConfigurationRepository: fakeConfigRepo });
    const result = await analyze({
      projectId: "p1",
      mediaPostId: "target",
      media: media({ id: "target", likes: 1000, comments: 200, shares: 50 }),
      baseline: [
        media({ id: "b1", likes: 10, comments: 1, shares: 0 }),
        media({ id: "b2", likes: 20, comments: 2, shares: 1 }),
        media({ id: "b3", likes: 15, comments: 1, shares: 0 }),
      ],
    });
    expect(result.whyItWorked).toBeTruthy();
    expect(result.suggestedImprovements.length).toBeGreaterThan(0);
    expect(result.slideBySlideStoryboard.length).toBeGreaterThan(0);
  });

  it("falls back gracefully with no baseline", async () => {
    const analyze = makeAnalyzeMedia({ aiProvider: fakeProvider, aiConfigurationRepository: fakeConfigRepo });
    const result = await analyze({
      projectId: "p1",
      mediaPostId: "target",
      media: media(),
    });
    expect(result.whyItWorked).toBeTruthy();
  });
});

import { describe, it, expect, vi } from "vitest";
import type { MarketingInsightsRepository } from "./ports";
import type { MetaMediaItem } from "@/modules/meta";

const mockMetaService = vi.hoisted(() => ({
  getAccountMedia: vi.fn(),
  getAccountStories: vi.fn(),
}));

const mockEventBus = vi.hoisted(() => ({
  publish: vi.fn(),
}));

vi.mock("@/modules/meta/server", () => ({
  metaService: mockMetaService,
}));

vi.mock("@/shared/events", () => ({
  eventBus: mockEventBus,
}));

vi.mock("@/modules/workspaces", () => ({
  organizationQueries: {},
}));

vi.mock("@/modules/ai/ai-services", () => ({
  analyzeMedia: vi.fn(),
  analyzeTrendingReels: vi.fn(),
  createContentIdea: vi.fn(),
}));

import { makeMarketingInsightsService } from "./marketing-insights";

function makeMediaItem(overrides: Partial<MetaMediaItem> = {}): MetaMediaItem {
  return {
    id: "id-m1",
    externalId: "m1",
    platform: "INSTAGRAM",
    mediaType: "IMAGE",
    mediaProductType: "FEED",
    caption: "hello",
    permalink: null,
    mediaUrl: null,
    thumbnailUrl: null,
    ownerUsername: null,
    publishedAt: new Date("2026-01-01"),
    hashtags: [],
    metrics: {},
    ...overrides,
  };
}

describe("makeMarketingInsightsService.syncMediaCatalog", () => {
  function makeRepo(): MarketingInsightsRepository {
    return {
      upsertMediaPost: vi.fn().mockImplementation((_projectId, input) => Promise.resolve({ id: `post-${input.externalId}`, ...input, projectId: "p1" })),
      upsertMediaInsight: vi.fn().mockResolvedValue(undefined),
    } as unknown as MarketingInsightsRepository;
  }

  it("syncs feed and stories and tolerates one failed story", async () => {
    mockMetaService.getAccountMedia.mockResolvedValue([
      makeMediaItem({ externalId: "feed-1", mediaType: "IMAGE" }),
    ]);
    mockMetaService.getAccountStories.mockResolvedValue([
      makeMediaItem({ externalId: "story-1", mediaType: "STORY", mediaProductType: "STORIES" }),
      makeMediaItem({ externalId: "story-2", mediaType: "STORY", mediaProductType: "STORIES" }),
    ]);

    const repo = makeRepo();
    const failingRepo: MarketingInsightsRepository = {
      ...repo,
      upsertMediaPost: vi.fn().mockImplementation((_projectId, input) => {
        if (input.externalId === "story-2") return Promise.reject(new Error("expired"));
        return Promise.resolve({ id: `post-${input.externalId}`, ...input, projectId: "p1" });
      }),
    } as unknown as MarketingInsightsRepository;

    const service = makeMarketingInsightsService({ repository: failingRepo });
    const result = await service.syncMediaCatalog("p1");

    expect(mockMetaService.getAccountMedia).toHaveBeenCalledWith("p1", 100);
    expect(mockMetaService.getAccountStories).toHaveBeenCalledWith("p1", 25);
    expect(result.upserted).toBe(2);
  });

  it("persists story-specific metrics", async () => {
    const repo = makeRepo();
    mockMetaService.getAccountMedia.mockResolvedValue([]);
    mockMetaService.getAccountStories.mockResolvedValue([
      makeMediaItem({
        externalId: "story-1",
        mediaType: "STORY",
        mediaProductType: "STORIES",
        metrics: {
          impressions: 100,
          reach: 80,
          storyExits: 5,
          storyRepliesCount: 2,
          storyTapsForward: 70,
          storyTapsBack: 3,
        },
      }),
    ]);

    const service = makeMarketingInsightsService({ repository: repo });
    await service.syncMediaCatalog("p1");

    expect(repo.upsertMediaInsight).toHaveBeenCalledWith(
      "post-story-1",
      expect.objectContaining({
        storyExits: 5,
        storyRepliesCount: 2,
        storyTapsForward: 70,
        storyTapsBack: 3,
      }),
    );
  });
});

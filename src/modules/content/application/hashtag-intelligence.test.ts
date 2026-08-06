import { describe, it, expect, vi } from "vitest";
import { makeHashtagIntelligence } from "./hashtag-intelligence";
import type { MetaMediaItem } from "@/modules/meta";

describe("makeHashtagIntelligence", () => {
  const media: MetaMediaItem[] = [
    {
      id: "m1",
      externalId: "e1",
      platform: "INSTAGRAM",
      mediaType: "IMAGE",
      caption: "Love this #handmade #jewelry piece",
      permalink: null,
      mediaUrl: null,
      thumbnailUrl: null,
      ownerUsername: null,
      publishedAt: new Date(),
      hashtags: ["handmade", "jewelry"],
      metrics: { likes: 100, comments: 20, shares: 5, saved: 10 },
    },
    {
      id: "m2",
      externalId: "e2",
      platform: "INSTAGRAM",
      mediaType: "IMAGE",
      caption: "New #jewelry #artisan drop",
      permalink: null,
      mediaUrl: null,
      thumbnailUrl: null,
      ownerUsername: null,
      publishedAt: new Date(),
      hashtags: ["jewelry", "artisan"],
      metrics: { likes: 200, comments: 30, shares: 10, saved: 20 },
    },
  ];

  const deps = {
    searchHashtag: vi.fn().mockResolvedValue({ hashtagId: "h1", userId: "u1" }),
    getHashtagMedia: vi.fn().mockResolvedValue(media),
  };

  it("returns deterministic hashtag analysis with related tags", async () => {
    const analyze = makeHashtagIntelligence(deps);
    const results = await analyze({ projectId: "p1", query: "jewelry" });

    expect(results).toHaveLength(3);
    expect(results[0]?.tag).toBe("jewelry");
    expect(results[0]?.relevanceScore).toBe(100);
    expect(results[0]?.postCount).toBe(2);
    expect(results[0]?.avgLikes).toBe(150);
    expect(results[0]?.competitionLevel).toBe("MEDIUM");
    expect(results.some((r) => r.tag === "handmade")).toBe(true);
    expect(results.some((r) => r.tag === "artisan")).toBe(true);
  });

  it("merges AI scores when scorer succeeds", async () => {
    const scorer = vi.fn().mockResolvedValue({
      competitionLevel: "MEDIUM",
      recommendation: "AI says use it",
    });

    const analyze = makeHashtagIntelligence({ ...deps, scoreHashtags: scorer });
    const results = await analyze({ projectId: "p1", query: "jewelry" });

    expect(scorer).toHaveBeenCalled();
    expect(results[0]?.competitionLevel).toBe("MEDIUM");
    expect(results[0]?.recommendation).toBe("AI says use it");
    expect(results[0]?.postCount).toBe(2);
  });

  it("falls back to deterministic analysis when AI scorer throws", async () => {
    const scorer = vi.fn().mockRejectedValue(new Error("ai error"));

    const analyze = makeHashtagIntelligence({ ...deps, scoreHashtags: scorer });
    const results = await analyze({ projectId: "p1", query: "jewelry" });

    expect(results[0]?.competitionLevel).toBe("MEDIUM");
    expect(results[0]?.postCount).toBe(2);
  });

  it("returns empty array when hashtag is not found", async () => {
    const analyze = makeHashtagIntelligence({
      searchHashtag: vi.fn().mockResolvedValue({ hashtagId: null, userId: "u1" }),
      getHashtagMedia: deps.getHashtagMedia,
    });
    const results = await analyze({ projectId: "p1", query: "nope" });
    expect(results).toEqual([]);
  });

  it("returns empty array when no media is returned", async () => {
    const analyze = makeHashtagIntelligence({
      searchHashtag: vi.fn().mockResolvedValue({ hashtagId: "h1", userId: "u1" }),
      getHashtagMedia: vi.fn().mockResolvedValue([]),
    });
    const results = await analyze({ projectId: "p1", query: "empty" });
    expect(results).toEqual([]);
  });
});

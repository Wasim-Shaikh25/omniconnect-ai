import { describe, it, expect } from "vitest";
import { topNPosts } from "./top-n";
import type { ScoredPost } from "./stats";

function post(id: string, overrides: Partial<ScoredPost> = {}): ScoredPost {
  return {
    id,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    plays: 0,
    views: 0,
    reach: 0,
    impressions: 0,
    ...overrides,
  };
}

describe("topNPosts", () => {
  it("ranks posts by engagement score", () => {
    const posts = [
      post("a", { likes: 1 }),
      post("b", { likes: 100 }),
      post("c", { likes: 50 }),
    ];
    const result = topNPosts({ posts }, 2);
    expect(result.operation).toBe("top_n");
    expect(result.values.count).toBe(2);
    expect(result.evidence[0]).toContain("b");
  });

  it("returns low confidence with insufficient data", () => {
    const result = topNPosts({ posts: [] }, 5);
    expect(result.confidence).toBe("low");
    expect(result.dataQuality).toBe("insufficient");
  });
});

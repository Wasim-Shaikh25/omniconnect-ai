import { describe, it, expect } from "vitest";
import { singlePostAnalysis } from "./single-post-analysis";
import type { ScoredPost } from "./stats";

function post(overrides: Partial<ScoredPost> = {}): ScoredPost {
  return {
    id: "p",
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

describe("singlePostAnalysis", () => {
  it("marks a high-scoring post as over-performed", () => {
    const target = post({ likes: 1000, comments: 200, shares: 100, saves: 50 });
    const baseline = Array.from({ length: 10 }, () => post({ likes: 10, comments: 2, shares: 1 }));
    const result = singlePostAnalysis({ target, baseline });
    expect(result.values.percentile).toBeGreaterThanOrEqual(75);
    expect(result.evidence.some((e) => e.includes("over-performed"))).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("marks a low-scoring post as under-performed", () => {
    const target = post({ likes: 1, comments: 0 });
    const baseline = Array.from({ length: 10 }, () => post({ likes: 100, comments: 20 }));
    const result = singlePostAnalysis({ target, baseline });
    expect(result.values.percentile).toBeLessThanOrEqual(25);
    expect(result.evidence.some((e) => e.includes("under-performed"))).toBe(true);
  });

  it("marks an average post as average", () => {
    const target = post({ likes: 50, comments: 10 });
    const baseline = [post({ likes: 40, comments: 8 }), post({ likes: 60, comments: 12 })];
    const result = singlePostAnalysis({ target, baseline });
    expect(result.values.percentile).toBeGreaterThan(25);
    expect(result.values.percentile).toBeLessThan(75);
    expect(result.evidence.some((e) => e.includes("average-performed"))).toBe(true);
  });

  it("returns low confidence with insufficient baseline", () => {
    const target = post({ likes: 10 });
    const baseline = [post({ likes: 5 })];
    const result = singlePostAnalysis({ target, baseline });
    expect(result.confidence).toBe("low");
    expect(result.dataQuality).toBe("insufficient");
  });
});

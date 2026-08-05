import { describe, it, expect } from "vitest";
import { engagementScore, zScore, percentileRank, correlation, topN } from "./stats";

describe("stats helpers", () => {
  it("engagementScore weights interactions correctly", () => {
    const post = { id: "1", likes: 10, comments: 5, shares: 2, saves: 3, plays: 100, views: 200, reach: 50, impressions: 60 };
    expect(engagementScore(post)).toBe(10 + 5 * 2 + 2 * 3 + 3 * 2 + 100 * 0.1 + 200 * 0.1);
  });

  it("percentileRank returns 50 for empty baseline", () => {
    expect(percentileRank([], 100)).toBe(50);
  });

  it("percentileRank computes rank correctly", () => {
    const values = [1, 2, 3, 4, 5];
    expect(percentileRank(values, 3)).toBe(50);
  });

  it("zScore handles zero stdDev", () => {
    expect(zScore([5, 5, 5], 5)).toBe(0);
  });

  it("correlation returns 1 for identical series", () => {
    expect(correlation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("topN sorts by score", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const scored = topN(items, (item) => (item.id === "b" ? 10 : 1), 2);
    expect(scored.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

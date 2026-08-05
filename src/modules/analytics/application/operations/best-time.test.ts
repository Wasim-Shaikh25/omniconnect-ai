import { describe, it, expect } from "vitest";
import { bestTime } from "./best-time";

function media(overrides: { publishedAt?: Date; likes?: number; comments?: number } = {}) {
  return {
    publishedAt: overrides.publishedAt ?? new Date("2026-08-05T11:00:00Z"),
    metrics: {
      likes: overrides.likes ?? 100,
      comments: overrides.comments ?? 10,
    },
  };
}

function order(overrides: { orderDate?: Date; total?: number } = {}) {
  return {
    orderDate: overrides.orderDate ?? new Date("2026-08-05T11:00:00Z"),
    total: overrides.total ?? 50,
  };
}

describe("bestTime", () => {
  it("returns the best posting window from media and orders", () => {
    const result = bestTime({
      media: [media({ likes: 1000, comments: 200 })],
      orders: [order({ total: 100 })],
    });
    expect(result.operation).toBe("best_time");
    expect(result.values.compositeScore).toBeGreaterThan(0);
    expect(result.evidence[0]).toMatch(/Best posting window:/);
  });

  it("returns low confidence with insufficient data", () => {
    const result = bestTime({ media: [], orders: [] });
    expect(result.confidence).toBe("low");
    expect(result.dataQuality).toBe("insufficient");
  });
});

import { describe, it, expect } from "vitest";
import { attributionBreakdown } from "./attribution-breakdown";

describe("attributionBreakdown", () => {
  it("ranks attribution records by revenue", () => {
    const result = attributionBreakdown({
      records: [
        { key: "post-a", revenue: 500, orders: 5 },
        { key: "post-b", revenue: 1200, orders: 12 },
        { key: "post-c", revenue: 300, orders: 3 },
      ],
    });
    expect(result.operation).toBe("attribution_breakdown");
    expect(result.values.totalRevenue).toBe(2000);
    expect(result.values.totalOrders).toBe(20);
    expect(result.values.topRevenue).toBe(1200);
    expect(result.evidence[0]).toContain("post-b");
  });

  it("handles empty records gracefully", () => {
    const result = attributionBreakdown({ records: [] });
    expect(result.dataQuality).toBe("insufficient");
    expect(result.confidence).toBe("low");
  });

  it("computes revenue shares", () => {
    const result = attributionBreakdown({
      records: [
        { key: "post-a", revenue: 100, orders: 1 },
        { key: "post-b", revenue: 100, orders: 1 },
      ],
    });
    expect(result.values.topRevenueShare).toBe(0.5);
  });
});

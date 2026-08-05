import { describe, it, expect } from "vitest";
import { comparePeriod } from "./compare-period";

describe("comparePeriod", () => {
  it("computes positive delta and direction up", () => {
    const result = comparePeriod({ current: [10, 20, 30], previous: [5, 10, 15] });
    expect(result.operation).toBe("compare_period");
    expect(result.values.currentMean).toBe(20);
    expect(result.values.previousMean).toBe(10);
    expect(result.values.delta).toBe(10);
    expect(result.values.percentChange).toBe(100);
    expect(result.values.direction).toBe(1);
  });

  it("computes negative delta and direction down", () => {
    const result = comparePeriod({ current: [5, 10, 15], previous: [10, 20, 30] });
    expect(result.values.direction).toBe(-1);
    expect(result.values.percentChange).toBe(-50);
  });

  it("handles empty previous period", () => {
    const result = comparePeriod({ current: [10, 20], previous: [] });
    expect(result.values.previousMean).toBe(0);
    expect(result.values.percentChange).toBe(0);
    expect(result.dataQuality).toBe("insufficient");
  });
});

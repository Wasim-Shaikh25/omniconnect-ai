import { describe, it, expect } from "vitest";
import { cohortTrend } from "./cohort-trend";

describe("cohortTrend", () => {
  it("detects a positive linear trend", () => {
    const result = cohortTrend({
      points: [
        { label: "Mon", value: 10 },
        { label: "Tue", value: 20 },
        { label: "Wed", value: 30 },
      ],
    });
    expect(result.operation).toBe("cohort_trend");
    expect(result.values.trendDirection).toBe(1);
    expect(result.values.r2).toBeCloseTo(1, 2);
    expect(result.values.predictedNext).toBe(40);
  });

  it("detects a negative trend", () => {
    const result = cohortTrend({
      points: [
        { label: "Mon", value: 30 },
        { label: "Tue", value: 20 },
        { label: "Wed", value: 10 },
      ],
    });
    expect(result.values.trendDirection).toBe(-1);
    expect(result.values.predictedNext).toBe(0);
  });

  it("returns insufficient data for one point", () => {
    const result = cohortTrend({ points: [{ label: "Mon", value: 10 }] });
    expect(result.dataQuality).toBe("insufficient");
    expect(result.confidence).toBe("low");
  });
});

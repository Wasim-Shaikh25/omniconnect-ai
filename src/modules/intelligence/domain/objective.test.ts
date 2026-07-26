import { describe, it, expect } from "vitest";
import {
  OBJECTIVE_PRIORITY,
  objectivePriority,
  inferBusinessObjective,
  diagnoseRecommendationContext,
  recalculateConfidence,
  clamp01,
} from "./objective";

describe("objectivePriority", () => {
  it("orders revenue highest and support lowest", () => {
    expect(objectivePriority("REVENUE")).toBeLessThan(objectivePriority("RETENTION"));
    expect(objectivePriority("RETENTION")).toBeLessThan(objectivePriority("GROWTH"));
    expect(objectivePriority("BRAND")).toBeLessThan(objectivePriority("SUPPORT"));
    expect(OBJECTIVE_PRIORITY.REVENUE).toBe(0);
  });
});

describe("inferBusinessObjective", () => {
  it("classifies revenue-related signals", () => {
    expect(inferBusinessObjective(["low_aov"], "increase orders")).toBe("REVENUE");
    expect(inferBusinessObjective([], "boost coupon conversion")).toBe("REVENUE");
  });

  it("classifies retention, growth, and brand", () => {
    expect(inferBusinessObjective(["churn_risk"], null)).toBe("RETENTION");
    expect(inferBusinessObjective(["follower_drop"], "grow audience reach")).toBe("GROWTH");
    expect(inferBusinessObjective(["ugc_opportunity"], "brand awareness")).toBe("BRAND");
  });

  it("routes complaints to support and generic comments to engagement", () => {
    expect(inferBusinessObjective(["complaint"], "handle objection")).toBe("SUPPORT");
    expect(inferBusinessObjective(["comment_spike"], "reply to comments")).toBe("ENGAGEMENT");
  });

  it("defaults to engagement when nothing matches", () => {
    expect(inferBusinessObjective([], null)).toBe("ENGAGEMENT");
  });
});

describe("diagnoseRecommendationContext", () => {
  it("picks the largest signal as the primary cause", () => {
    const result = diagnoseRecommendationContext({
      reasonCodes: [],
      marketTrendDelta: 0.1,
      competitorDelta: 0.4,
      selfDelta: -0.05,
    });
    expect(result.primaryCause).toBe("COMPETITOR_ADVANTAGE");
    expect(result.competitorContext).not.toBeNull();
  });

  it("falls back to self-mistake for data hygiene reason codes", () => {
    const result = diagnoseRecommendationContext({ reasonCodes: ["stale_data"] });
    expect(result.primaryCause).toBe("SELF_MISTAKE");
  });

  it("returns unknown with no comparative signal", () => {
    const result = diagnoseRecommendationContext({ reasonCodes: [] });
    expect(result.primaryCause).toBe("UNKNOWN");
  });
});

describe("recalculateConfidence", () => {
  it("increases confidence with supporting signals", () => {
    const result = recalculateConfidence({
      currentConfidence: 0.5,
      currentSignals: 1,
      supportingSignals: 4,
      contradictingSignals: 0,
    });
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals).toBe(5);
  });

  it("decreases confidence with contradicting signals", () => {
    const result = recalculateConfidence({
      currentConfidence: 0.8,
      currentSignals: 2,
      supportingSignals: 0,
      contradictingSignals: 4,
    });
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("clamps to [0,1] and handles zero signals", () => {
    const result = recalculateConfidence({
      currentConfidence: 1.5,
      currentSignals: 0,
      supportingSignals: 0,
      contradictingSignals: 0,
    });
    expect(result.confidence).toBe(1);
    expect(result.signals).toBe(0);
  });
});

describe("clamp01", () => {
  it("bounds values and coerces NaN to 0", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
  });
});

import { describe, it, expect } from "vitest";
import { computeActionPriority, classifyOutcome } from "./daily-action";

describe("computeActionPriority", () => {
  it("ranks revenue above engagement at equal confidence and score", () => {
    const revenue = computeActionPriority({ objective: "REVENUE", confidence: 0.5, recommendationScore: 10 });
    const engagement = computeActionPriority({ objective: "ENGAGEMENT", confidence: 0.5, recommendationScore: 10 });
    expect(revenue).toBeGreaterThan(engagement);
  });

  it("rewards higher confidence", () => {
    const high = computeActionPriority({ objective: "GROWTH", confidence: 0.9, recommendationScore: 5 });
    const low = computeActionPriority({ objective: "GROWTH", confidence: 0.1, recommendationScore: 5 });
    expect(high).toBeGreaterThan(low);
  });

  it("ignores negative recommendation scores", () => {
    const negative = computeActionPriority({ objective: "BRAND", confidence: 0.5, recommendationScore: -100 });
    const zero = computeActionPriority({ objective: "BRAND", confidence: 0.5, recommendationScore: 0 });
    expect(negative).toBe(zero);
  });
});

describe("classifyOutcome", () => {
  it("detects improvement beyond the threshold", () => {
    expect(classifyOutcome(100, 110)).toBe("IMPROVED");
  });

  it("detects worsening beyond the threshold", () => {
    expect(classifyOutcome(100, 90)).toBe("WORSENED");
  });

  it("treats small changes as no change", () => {
    expect(classifyOutcome(100, 102)).toBe("NO_CHANGE");
  });

  it("handles null and zero baselines", () => {
    expect(classifyOutcome(null, 100)).toBe("NO_CHANGE");
    expect(classifyOutcome(0, 5)).toBe("IMPROVED");
    expect(classifyOutcome(0, 0)).toBe("NO_CHANGE");
  });
});

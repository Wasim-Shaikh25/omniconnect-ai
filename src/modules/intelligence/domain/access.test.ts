import { describe, it, expect } from "vitest";
import { canUseIntelligenceFeature, type IntelligenceFeature } from "./access";

describe("canUseIntelligenceFeature", () => {
  const freeFeatures: { feature: IntelligenceFeature; allowed: boolean }[] = [
    { feature: "dailyBrief", allowed: true },
    { feature: "marketingBrain", allowed: false },
    { feature: "nextBestAction", allowed: false },
    { feature: "signalDetection", allowed: false },
    { feature: "predictions", allowed: false },
    { feature: "hypotheses", allowed: false },
    { feature: "businessLearnings", allowed: false },
  ];

  const proFeatures: { feature: IntelligenceFeature; allowed: boolean }[] = [
    { feature: "dailyBrief", allowed: true },
    { feature: "marketingBrain", allowed: true },
    { feature: "nextBestAction", allowed: true },
    { feature: "signalDetection", allowed: true },
    { feature: "hypotheses", allowed: true },
    { feature: "businessLearnings", allowed: true },
    { feature: "predictions", allowed: false },
  ];

  const businessFeatures: { feature: IntelligenceFeature; allowed: boolean }[] = [
    { feature: "dailyBrief", allowed: true },
    { feature: "marketingBrain", allowed: true },
    { feature: "nextBestAction", allowed: true },
    { feature: "signalDetection", allowed: true },
    { feature: "predictions", allowed: true },
    { feature: "hypotheses", allowed: true },
    { feature: "businessLearnings", allowed: true },
  ];

  it.each(freeFeatures)("FREE plan allows $feature: $allowed", ({ feature, allowed }) => {
    expect(canUseIntelligenceFeature("FREE", feature)).toBe(allowed);
  });

  it.each(proFeatures)("PRO plan allows $feature: $allowed", ({ feature, allowed }) => {
    expect(canUseIntelligenceFeature("PRO", feature)).toBe(allowed);
  });

  it.each(businessFeatures)("BUSINESS plan allows $feature: $allowed", ({ feature, allowed }) => {
    expect(canUseIntelligenceFeature("BUSINESS", feature)).toBe(allowed);
  });

  it("defaults to FREE when plan is missing", () => {
    expect(canUseIntelligenceFeature(undefined, "dailyBrief")).toBe(true);
    expect(canUseIntelligenceFeature(null, "predictions")).toBe(false);
  });
});

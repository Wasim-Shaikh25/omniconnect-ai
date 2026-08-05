import { describe, it, expect } from "vitest";
import type { AIProvider } from "@/modules/ai";
import { makeOpenRouterDemographicEstimator } from "./open-router-demographic-estimator";
import type { PublicProfile, DemographicEstimate } from "../domain/types";
import type { DemographicEstimator } from "../application/ports";

function makeProfile(): PublicProfile {
  return {
    username: "testuser",
    followerCount: 10000,
    mediaCount: 2,
    bioLength: 100,
    media: [
      {
        id: "m1",
        type: "photo",
        caption: "Hello #mumbai",
        timestamp: "2026-01-01T10:00:00Z",
        likes: 100,
        comments: 10,
        url: "https://instagram.com/p/m1",
        location: "Mumbai, India",
        hashtags: ["#mumbai"],
      },
    ],
    comments: [{ text: "Nice!" }],
  };
}

const fallbackEstimate: DemographicEstimate = {
  confidence: "low",
  topCountries: [{ country: "Unknown", percentage: 100 }],
  topCities: [{ city: "Unknown", percentage: 100 }],
  ageRanges: [{ range: "18-34", percentage: 100 }],
  genderSplit: { male: 50, female: 50, other: 0 },
};

const fallbackEstimator: DemographicEstimator = {
  async estimate() {
    return fallbackEstimate;
  },
};

describe("makeOpenRouterDemographicEstimator", () => {
  it("returns parsed demographics when the AI returns valid JSON", async () => {
    const aiProvider: AIProvider = {
      async complete() {
        return JSON.stringify({
          confidence: "medium",
          topCountries: [{ country: "India", percentage: 60 }, { country: "USA", percentage: 40 }],
          topCities: [{ city: "Mumbai", percentage: 60 }, { city: "New York", percentage: 40 }],
          ageRanges: [{ range: "18-34", percentage: 50 }, { range: "35-54", percentage: 50 }],
          genderSplit: { male: 45, female: 45, other: 10 },
        });
      },
    };

    const estimator = makeOpenRouterDemographicEstimator(
      { aiProvider, model: "openai/gpt-4o-mini" },
      fallbackEstimator,
    );
    const result = await estimator.estimate(makeProfile());

    expect(result.confidence).toBe("medium");
    expect(result.topCountries).toHaveLength(2);
    expect(result.topCities[0]?.city).toBe("Mumbai");
    expect(result.genderSplit.male).toBe(45);
  });

  it("falls back when the AI returns invalid JSON", async () => {
    const aiProvider: AIProvider = {
      async complete() {
        return "not json";
      },
    };

    const estimator = makeOpenRouterDemographicEstimator(
      { aiProvider, model: "openai/gpt-4o-mini" },
      fallbackEstimator,
    );
    const result = await estimator.estimate(makeProfile());
    expect(result).toEqual(fallbackEstimate);
  });

  it("falls back when the AI JSON does not match the schema", async () => {
    const aiProvider: AIProvider = {
      async complete() {
        return JSON.stringify({ confidence: "high" });
      },
    };

    const estimator = makeOpenRouterDemographicEstimator(
      { aiProvider, model: "openai/gpt-4o-mini" },
      fallbackEstimator,
    );
    const result = await estimator.estimate(makeProfile());
    expect(result).toEqual(fallbackEstimate);
  });
});

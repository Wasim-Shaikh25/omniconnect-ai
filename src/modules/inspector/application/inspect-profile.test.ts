import { describe, it, expect } from "vitest";
import { inspectProfile } from "./inspect-profile";
import { deterministicProfileNarrator } from "./deterministic-narrator";
import type { ProfileFetcher, DemographicEstimator } from "./ports";
import type { PublicProfile, DemographicEstimate } from "../domain/types";

function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    username: "testuser",
    followerCount: 10000,
    mediaCount: 50,
    bioLength: 120,
    media: [
      {
        id: "m1",
        type: "reel",
        caption: "Great product #mumbai",
        timestamp: "2026-01-01T10:00:00Z",
        likes: 500,
        comments: 40,
        shares: 10,
        saves: 20,
        url: "https://instagram.com/p/m1",
        location: "Mumbai, India",
        hashtags: ["#mumbai", "#style"],
      },
      {
        id: "m2",
        type: "photo",
        caption: "Outfit of the day #nyc",
        timestamp: "2026-01-02T14:00:00Z",
        likes: 300,
        comments: 25,
        url: "https://instagram.com/p/m2",
        location: "New York, USA",
        hashtags: ["#nyc", "#fashion"],
      },
    ],
    comments: [
      { text: "Love this!" },
      { text: "Amazing content" },
    ],
    followerSnapshots: [
      { date: "2026-01-01", count: 9500 },
      { date: "2026-01-02", count: 10000 },
    ],
    ...overrides,
  };
}

const fakeFetcher: ProfileFetcher = {
  async fetch(username: string) {
    return makeProfile({ username });
  },
};

describe("inspectProfile", () => {
  it("returns a full inspection result for a public profile", async () => {
    const result = await inspectProfile({ fetcher: fakeFetcher, narrator: deterministicProfileNarrator }, "testuser", "project-1");
    expect(result).not.toBeNull();
    expect(result!.username).toBe("testuser");
    expect(result!.followerCount).toBe(10000);
    expect(result!.engagementRate).toBeGreaterThan(0);
    expect(result!.audienceQuality.label).toBeDefined();
    expect(result!.topContent.length).toBeGreaterThan(0);
    expect(result!.growthTrend).toBe("growing");
    expect(result!.narration).toContain("testuser");
  });

  it("returns null when the fetcher cannot find a profile", async () => {
    const fetcher: ProfileFetcher = { async fetch() { return null; } };
    const result = await inspectProfile({ fetcher, narrator: deterministicProfileNarrator }, "missing", "project-1");
    expect(result).toBeNull();
  });

  it("uses a custom demographic estimator when provided", async () => {
    const customEstimate: DemographicEstimate = {
      confidence: "high",
      topCountries: [{ country: "India", percentage: 60 }, { country: "USA", percentage: 40 }],
      topCities: [{ city: "Mumbai", percentage: 60 }, { city: "New York", percentage: 40 }],
      ageRanges: [{ range: "18-24", percentage: 100 }],
      genderSplit: { male: 50, female: 45, other: 5 },
    };
    const customEstimator: DemographicEstimator = {
      async estimate() {
        return customEstimate;
      },
    };

    const result = await inspectProfile(
      { fetcher: fakeFetcher, narrator: deterministicProfileNarrator, demographicEstimator: customEstimator },
      "testuser",
      "project-1",
    );
    expect(result).not.toBeNull();
    expect(result!.demographics).toEqual(customEstimate);
  });

  it("labels low audience quality for spammy signals", async () => {
    const fetcher: ProfileFetcher = {
      async fetch() {
        return makeProfile({
          followerCount: 50000,
          mediaCount: 2,
          media: Array.from({ length: 10 }, (_, i) => ({
            id: `spam-${i}`,
            type: "photo",
            caption: "Buy now",
            timestamp: "2026-01-01T10:00:00Z",
            likes: 10,
            comments: 0,
            url: "https://instagram.com/p/spam",
            location: null,
            hashtags: ["#spam", "#buy", "#cheap", "#deal", "#sale", "#discount", "#offer", "#free", "#win", "#click", "#follow", "#like", "#share", "#tag", "# promo", "# ads", "#marketing", "#crypto", "#forex", "#weightloss"],
          })),
          comments: Array.from({ length: 10 }, () => ({ text: "Great post! DM me" })),
        });
      },
    };

    const result = await inspectProfile({ fetcher, narrator: deterministicProfileNarrator }, "spamuser", "project-1");
    expect(result).not.toBeNull();
    expect(result!.audienceQuality.label).toBe("low");
  });
});

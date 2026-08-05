import { describe, it, expect } from "vitest";
import { profileQuality } from "./profile-quality";

function makeMedia(overrides: Partial<{ likes: number; comments: number; captionLength: number; hashtags: string[]; location: string | null }> = {}) {
  return {
    likes: 100,
    comments: 10,
    captionLength: 120,
    hashtags: ["#fashion", "#style"],
    location: "New York",
    ...overrides,
  };
}

describe("profileQuality", () => {
  it("scores a high-quality profile highly", () => {
    const result = profileQuality({
      profile: { followerCount: 10000, mediaCount: 100, bioLength: 120 },
      media: Array.from({ length: 20 }, (_, i) =>
        makeMedia({
          likes: 500 + i * 10,
          comments: 40 + i,
          hashtags: [`#tag${i}`, `#style`],
          location: `City ${i % 5}`,
        })
      ),
      comments: Array.from({ length: 20 }, (_, i) => ({ text: `Nice post ${i}` })),
    });
    expect(result.operation).toBe("profile_quality");
    expect(result.values.profileQuality).toBeGreaterThan(0.5);
    expect(result.dataQuality).toBe("live");
    expect(result.confidence).toBe("high");
  });

  it("penalizes spammy profiles", () => {
    const result = profileQuality({
      profile: { followerCount: 50000, mediaCount: 10, bioLength: 20 },
      media: Array.from({ length: 10 }, () =>
        makeMedia({
          likes: 1000,
          comments: 0,
          hashtags: Array.from({ length: 35 }, (_, i) => `#tag${i}`),
          location: null,
        })
      ),
      comments: Array.from({ length: 20 }, () => ({ text: "Great!" })),
    });
    expect(result.values.spamRisk).toBeGreaterThan(0.3);
    expect(result.values.profileQuality).toBeLessThan(0.5);
  });

  it("returns insufficient data for empty media", () => {
    const result = profileQuality({
      profile: { followerCount: 1000, mediaCount: 0, bioLength: 0 },
      media: [],
      comments: [],
    });
    expect(result.dataQuality).toBe("insufficient");
    expect(result.values.profileQuality).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { singlePostAnalysis } from "./single-post-analysis";
import { topNPosts } from "./top-n";
import { bestTime } from "./best-time";
import { comparePeriod } from "./compare-period";
import { anomalyCheck } from "./anomaly-check";
import { correlation } from "./correlation";
import { cohortTrend } from "./cohort-trend";
import { attributionBreakdown } from "./attribution-breakdown";
import { profileQuality } from "./profile-quality";

const sampleScoredPost = {
  id: "post-1",
  likes: 100,
  comments: 10,
  shares: 5,
  saves: 8,
  plays: 0,
  views: 0,
  reach: 1000,
  impressions: 1200,
};

const sampleBaseline = [
  { ...sampleScoredPost, id: "base-1", likes: 50, comments: 5 },
  { ...sampleScoredPost, id: "base-2", likes: 150, comments: 20 },
  { ...sampleScoredPost, id: "base-3", likes: 80, comments: 8 },
  { ...sampleScoredPost, id: "base-4", likes: 200, comments: 30 },
];

describe("golden tests — deterministic output for fixed fixtures", () => {
  it("single_post_analysis", () => {
    const result = singlePostAnalysis({ target: sampleScoredPost, baseline: sampleBaseline });
    expect(result).toMatchSnapshot();
  });

  it("top_n", () => {
    const result = topNPosts({ posts: [sampleScoredPost, ...sampleBaseline] }, 3);
    expect(result).toMatchSnapshot();
  });

  it("best_time", () => {
    const result = bestTime({
      media: [
        { publishedAt: new Date("2026-01-05T10:00:00Z"), metrics: { likes: 100, comments: 10 } },
        { publishedAt: new Date("2026-01-12T10:00:00Z"), metrics: { likes: 120, comments: 12 } },
      ],
      orders: [
        { orderDate: new Date("2026-01-05T10:00:00Z"), total: 50 },
        { orderDate: new Date("2026-01-12T10:00:00Z"), total: 80 },
      ],
    });
    expect(result).toMatchSnapshot();
  });

  it("compare_period", () => {
    const result = comparePeriod({ current: [10, 20, 30], previous: [5, 10, 15] });
    expect(result).toMatchSnapshot();
  });

  it("anomaly_check", () => {
    const result = anomalyCheck({ values: [1, 2, 3, 4, 5, 100] });
    expect(result).toMatchSnapshot();
  });

  it("correlation", () => {
    const result = correlation({ x: [1, 2, 3, 4, 5], y: [2, 4, 6, 8, 10] });
    expect(result).toMatchSnapshot();
  });

  it("cohort_trend", () => {
    const result = cohortTrend({
      points: [
        { label: "Mon", value: 10 },
        { label: "Tue", value: 20 },
        { label: "Wed", value: 30 },
      ],
    });
    expect(result).toMatchSnapshot();
  });

  it("attribution_breakdown", () => {
    const result = attributionBreakdown({
      records: [
        { key: "post-a", revenue: 500, orders: 5 },
        { key: "post-b", revenue: 1200, orders: 12 },
        { key: "post-c", revenue: 300, orders: 3 },
      ],
    });
    expect(result).toMatchSnapshot();
  });

  it("profile_quality", () => {
    const result = profileQuality({
      profile: { followerCount: 10000, mediaCount: 100, bioLength: 120 },
      media: Array.from({ length: 20 }, (_, i) => ({
        likes: 500 + i * 10,
        comments: 40 + i,
        captionLength: 120,
        hashtags: [`#tag${i}`, `#style`],
        location: `City ${i % 5}`,
      })),
      comments: Array.from({ length: 20 }, (_, i) => ({ text: `Nice post ${i}` })),
    });
    expect(result).toMatchSnapshot();
  });
});

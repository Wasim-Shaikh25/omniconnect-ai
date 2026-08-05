import { describe, it, expect } from "vitest";
import { queryAnalytics } from "./query-analytics";
import { resolveOperation } from "./operation-resolver";
import { generateDashboard } from "./generate-dashboard";
import {
  keywordEmbeddingProvider,
  makeAnalysisEngine,
  singlePostAnalysis,
  topNPosts,
  bestTime,
  comparePeriod,
  anomalyCheck,
  correlation as correlationOp,
  cohortTrend,
  attributionBreakdown,
  profileQuality,
  type AnalysisEngineOperations,
} from "@/modules/analytics/pure";
import type { AnalysisSpec } from "@/modules/analytics/pure";

const operations = {
  single_post_analysis: singlePostAnalysis,
  top_n: topNPosts,
  best_time: bestTime,
  compare_period: comparePeriod,
  anomaly_check: anomalyCheck,
  correlation: correlationOp,
  cohort_trend: cohortTrend,
  attribution_breakdown: attributionBreakdown,
  profile_quality: profileQuality,
};

function fakeFetchDataset(spec: AnalysisSpec) {
  switch (spec.operation) {
    case "top_n":
      return Promise.resolve({
        posts: [
          { id: "post-1", likes: 100, comments: 10, shares: 5, saves: 8, plays: 0, views: 0, reach: 1000, impressions: 1200 },
          { id: "post-2", likes: 200, comments: 20, shares: 10, saves: 16, plays: 0, views: 0, reach: 2000, impressions: 2400 },
        ],
      });
    case "best_time":
      return Promise.resolve({
        media: [
          { publishedAt: new Date("2026-01-05T10:00:00Z"), metrics: { likes: 100, comments: 10 } },
        ],
        orders: [
          { orderDate: new Date("2026-01-05T10:00:00Z"), total: 50 },
        ],
      });
    case "compare_period":
      return Promise.resolve({ current: [10, 20, 30], previous: [5, 10, 15] });
    case "anomaly_check":
      return Promise.resolve({ values: [1, 2, 3, 4, 5, 100] });
    case "correlation":
      return Promise.resolve({ x: [1, 2, 3, 4, 5], y: [2, 4, 6, 8, 10] });
    case "cohort_trend":
      return Promise.resolve({
        points: [
          { label: "Mon", value: 10 },
          { label: "Tue", value: 20 },
          { label: "Wed", value: 30 },
        ],
      });
    case "attribution_breakdown":
      return Promise.resolve({
        records: [
          { key: "post-a", revenue: 500, orders: 5 },
          { key: "post-b", revenue: 1200, orders: 12 },
        ],
      });
    case "profile_quality":
      return Promise.resolve({
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
    case "single_post_analysis":
    default:
      return Promise.resolve({
        target: { id: "post-1", likes: 100, comments: 10, shares: 5, saves: 8, plays: 0, views: 0, reach: 1000, impressions: 1200 },
        baseline: [
          { id: "base-1", likes: 50, comments: 5, shares: 2, saves: 4, plays: 0, views: 0, reach: 500, impressions: 600 },
          { id: "base-2", likes: 150, comments: 20, shares: 8, saves: 12, plays: 0, views: 0, reach: 1500, impressions: 1800 },
        ],
      });
  }
}

const engine = makeAnalysisEngine({
  fetchDataset: fakeFetchDataset,
  operations: operations as unknown as AnalysisEngineOperations,
});

async function resolve(question: string) {
  return resolveOperation(question, keywordEmbeddingProvider);
}

describe("queryAnalytics", () => {
  it("resolves, fetches, and runs top_n", async () => {
    const result = await queryAnalytics({ resolveOperation: resolve, engine }, "top 3 posts", "project-1");
    expect("result" in result).toBe(true);
    if ("result" in result) {
      expect(result.result.operation).toBe("top_n");
    }
  });

  it("resolves, fetches, and runs compare_period", async () => {
    const result = await queryAnalytics({ resolveOperation: resolve, engine }, "compare revenue this month vs last", "project-1");
    expect("result" in result).toBe(true);
    if ("result" in result) {
      expect(result.result.operation).toBe("compare_period");
    }
  });

  it("returns unsupported for unrelated questions", async () => {
    const result = await queryAnalytics({ resolveOperation: resolve, engine }, "what is the weather", "project-1");
    expect("unsupported" in result).toBe(true);
  });
});

describe("generateDashboard", () => {
  it("transforms a queryAnalytics result into a DashboardSchema", async () => {
    const queryResult = await queryAnalytics({ resolveOperation: resolve, engine }, "best time to post", "project-1");
    const dashboard = generateDashboard(queryResult);
    expect("schema" in dashboard).toBe(true);
    if ("schema" in dashboard) {
      expect(dashboard.schema.title).toContain("best_time");
      expect(dashboard.schema.widgets.length).toBeGreaterThan(0);
    }
  });

  it("passes through unsupported", async () => {
    const queryResult = await queryAnalytics({ resolveOperation: resolve, engine }, "weather", "project-1");
    const dashboard = generateDashboard(queryResult);
    expect("unsupported" in dashboard).toBe(true);
  });
});

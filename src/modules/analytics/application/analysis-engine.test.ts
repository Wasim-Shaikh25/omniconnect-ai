import { describe, it, expect } from "vitest";
import { makeAnalysisEngine } from "./analysis-engine";
import { singlePostAnalysis } from "./operations/single-post-analysis";
import { UnsupportedOperationError, type AnalysisSpec } from "../domain/analysis";
import type { ScoredPost } from "./operations/stats";

describe("makeAnalysisEngine", () => {
  it("rejects an unsupported operation", async () => {
    const engine = makeAnalysisEngine({
      fetchDataset: async () => ({}),
      operations: { single_post_analysis: singlePostAnalysis } as unknown as Parameters<typeof makeAnalysisEngine>[0]["operations"],
    });

    await expect(
      engine.run(
        { operation: "best_time", metrics: ["engagement"], target: {} } as AnalysisSpec,
        { projectId: "p1" },
      ),
    ).rejects.toBeInstanceOf(UnsupportedOperationError);
  });

  it("dispatches a single_post_analysis with project-scoped data", async () => {
    const target: ScoredPost = { id: "t", likes: 100, comments: 10, shares: 5, saves: 2, plays: 0, views: 0, reach: 0, impressions: 0 };
    const baseline: ScoredPost[] = [
      { id: "b1", likes: 10, comments: 1, shares: 0, saves: 0, plays: 0, views: 0, reach: 0, impressions: 0 },
    ];

    const engine = makeAnalysisEngine({
      fetchDataset: async (spec, projectId) => {
        expect(projectId).toBe("p1");
        return { target, baseline };
      },
      operations: { single_post_analysis: singlePostAnalysis } as unknown as Parameters<typeof makeAnalysisEngine>[0]["operations"],
    });

    const result = await engine.run(
      { operation: "single_post_analysis", metrics: ["engagement"], target: { postId: "t" } },
      { projectId: "p1" },
    );

    expect(result.operation).toBe("single_post_analysis");
    expect(result.values.percentile).toBe(100);
  });
});

import { describe, it, expect } from "vitest";
import { resolveOperation } from "./operation-resolver";
import { keywordEmbeddingProvider } from "@/modules/analytics/pure";

describe("resolveOperation", () => {
  it("resolves a top_n question", async () => {
    const result = await resolveOperation("What are my top 5 performing posts?", keywordEmbeddingProvider);
    expect("unsupported" in result).toBe(false);
    if ("spec" in result) {
      expect(result.spec.operation).toBe("top_n");
      expect(result.spec.topN).toBe(5);
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  it("resolves a compare_period question", async () => {
    const result = await resolveOperation("Compare revenue this month vs last month", keywordEmbeddingProvider);
    expect("unsupported" in result).toBe(false);
    if ("spec" in result) {
      expect(result.spec.operation).toBe("compare_period");
      expect(result.spec.metrics).toContain("revenue");
    }
  });

  it("resolves a best_time question", async () => {
    const result = await resolveOperation("When is the best time to post?", keywordEmbeddingProvider);
    expect("unsupported" in result).toBe(false);
    if ("spec" in result) {
      expect(result.spec.operation).toBe("best_time");
    }
  });

  it("returns unsupported for unrelated questions", async () => {
    const result = await resolveOperation("What is the weather today?", keywordEmbeddingProvider);
    expect("unsupported" in result).toBe(true);
  });
});

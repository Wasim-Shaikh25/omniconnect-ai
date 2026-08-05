import { describe, it, expect } from "vitest";
import { anomalyCheck } from "./anomaly-check";

describe("anomalyCheck", () => {
  it("flags a high outlier", () => {
    const result = anomalyCheck({ values: [1, 2, 3, 4, 5, 100] });
    expect(result.operation).toBe("anomaly_check");
    expect(result.values.anomalyCount).toBeGreaterThanOrEqual(1);
    expect(result.evidence[result.evidence.length - 1]).toContain("1 anomalies");
  });

  it("returns no anomalies for uniform data", () => {
    const result = anomalyCheck({ values: [10, 10, 10, 10] });
    expect(result.values.anomalyCount).toBe(0);
  });

  it("reports low confidence for small samples", () => {
    const result = anomalyCheck({ values: [1, 2] });
    expect(result.confidence).toBe("low");
    expect(result.dataQuality).toBe("insufficient");
  });
});

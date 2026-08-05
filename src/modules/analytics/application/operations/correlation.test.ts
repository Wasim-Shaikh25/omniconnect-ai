import { describe, it, expect } from "vitest";
import { correlation } from "./correlation";

describe("correlation", () => {
  it("returns strong positive r for perfectly correlated data", () => {
    const result = correlation({ x: [1, 2, 3, 4, 5], y: [2, 4, 6, 8, 10] });
    expect(result.operation).toBe("correlation");
    expect(result.values.r).toBeCloseTo(1, 2);
    expect(result.values.slope).toBe(1);
  });

  it("returns strong negative r for inversely correlated data", () => {
    const result = correlation({ x: [1, 2, 3, 4, 5], y: [10, 8, 6, 4, 2] });
    expect(result.values.r).toBeCloseTo(-1, 2);
    expect(result.values.slope).toBe(-1);
  });

  it("returns insufficient data quality for small samples", () => {
    const result = correlation({ x: [1], y: [2] });
    expect(result.values.sampleSize).toBe(1);
    expect(result.dataQuality).toBe("insufficient");
  });
});

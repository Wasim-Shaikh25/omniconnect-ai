import type { AnalysisResult } from "../../domain/analysis";

export interface CohortTrendPoint {
  label: string;
  value: number;
}

export interface CohortTrendDataset {
  points: CohortTrendPoint[];
}

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denominator = n * sumX2 - sumX * sumX;

  const meanX = sumX / n;
  const meanY = sumY / n;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = meanY - slope * meanX;

  const ssTotal = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssResidual = points.reduce((s, p) => {
    const predicted = slope * p.x + intercept;
    return s + (p.y - predicted) ** 2;
  }, 0);
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  const predictedNext = slope * n + intercept;

  return { slope, intercept, r2, predictedNext, meanX, meanY };
}

export function cohortTrend(dataset: CohortTrendDataset): AnalysisResult {
  const points = dataset.points;

  if (points.length < 2) {
    return {
      operation: "cohort_trend",
      values: {},
      evidence: ["At least two trend points are required."],
      confidence: "low",
      dataQuality: "insufficient",
    };
  }

  const regressionPoints = points.map((p, i) => ({ x: i, y: p.value }));
  const { slope, intercept, r2, predictedNext } = linearRegression(regressionPoints);
  const direction = slope > 0.0001 ? 1 : slope < -0.0001 ? -1 : 0;

  const fitted = regressionPoints.map((p) => Math.round((slope * p.x + intercept) * 100) / 100);

  return {
    operation: "cohort_trend",
    values: {
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      r2: Math.round(r2 * 1000) / 1000,
      predictedNext: Math.round(predictedNext * 100) / 100,
      trendDirection: direction,
      pointCount: points.length,
    },
    series: [
      { label: "actual", data: points.map((p) => p.value) },
      { label: "fitted", data: fitted },
    ],
    evidence: [
      `Linear trend slope ${slope.toFixed(3)} across ${points.length} points`,
      `Intercept ${intercept.toFixed(2)}`,
      `R² = ${r2.toFixed(3)}`,
      `Predicted next value ${predictedNext.toFixed(2)}`,
      direction === 1 ? "Trend: growing" : direction === -1 ? "Trend: declining" : "Trend: flat",
    ],
    confidence: points.length >= 14 && r2 >= 0.5 ? "high" : points.length >= 7 ? "medium" : "low",
    dataQuality: points.length >= 3 ? "live" : "insufficient",
  };
}

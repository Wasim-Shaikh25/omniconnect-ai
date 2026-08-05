import { correlation as pearsonCorrelation, mean } from "./stats";
import type { AnalysisResult } from "../../domain/analysis";

export interface CorrelationDataset {
  x: number[];
  y: number[];
}

function approximatePValue(r: number, n: number): number {
  if (n < 3 || Math.abs(r) >= 1) return 0;
  const tStatistic = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
  const df = n - 2;
  // Approximate two-tailed p-value using the t CDF tail bound for |t| >= 1
  // For small/large t, this gives a reasonable ballpark for reporting.
  const tail = Math.exp(-(df / (df + tStatistic * tStatistic)) * Math.log(Math.max(1, tStatistic)));
  return Math.min(1, Math.max(0, 2 * tail));
}

export function correlation(dataset: CorrelationDataset): AnalysisResult {
  const { x, y } = dataset;
  const n = Math.min(x.length, y.length);

  if (n < 2) {
    return {
      operation: "correlation",
      values: { r: 0, rSquared: 0, pValue: 1, sampleSize: n },
      evidence: ["At least two paired observations are required for correlation."],
      confidence: "low",
      dataQuality: "insufficient",
    };
  }

  const pairedX = x.slice(0, n);
  const pairedY = y.slice(0, n);
  const r = pearsonCorrelation(pairedX, pairedY);
  const rSquared = r * r;
  const pValue = approximatePValue(r, n);

  const slope =
    rSquared >= 0.81 && r > 0 ? 1 : rSquared >= 0.81 && r < 0 ? -1 : 0;

  return {
    operation: "correlation",
    values: {
      r: Math.round(r * 1000) / 1000,
      rSquared: Math.round(rSquared * 1000) / 1000,
      pValue: Math.round(pValue * 1000) / 1000,
      sampleSize: n,
      slope,
      xMean: Math.round(mean(pairedX) * 100) / 100,
      yMean: Math.round(mean(pairedY) * 100) / 100,
    },
    series: [
      { label: "x", data: pairedX },
      { label: "y", data: pairedY },
    ],
    evidence: [
      `Pearson r = ${r.toFixed(3)} (R² = ${rSquared.toFixed(3)})`,
      `Sample size ${n}`,
      `Approximate p-value ${pValue.toFixed(3)}`,
      slope === 1 ? "Strong positive association" : slope === -1 ? "Strong negative association" : "Weak or no clear association",
    ],
    confidence:
      n >= 30 && Math.abs(r) >= 0.5 ? "high" : n >= 10 && Math.abs(r) >= 0.3 ? "medium" : "low",
    dataQuality: n >= 10 ? "live" : n >= 3 ? "partial" : "insufficient",
  };
}

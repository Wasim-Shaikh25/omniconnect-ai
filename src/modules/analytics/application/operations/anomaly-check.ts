import { mean, stdDev } from "./stats";
import type { AnalysisResult } from "../../domain/analysis";

export interface AnomalyCheckDataset {
  values: number[];
  threshold?: number;
}

export interface AnomalyCheckResult {
  indices: number[];
  values: number[];
  zScores: number[];
}

function iqrThreshold(values: number[]): { lower: number; upper: number } {
  const sorted = values.slice().sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index] ?? 0;
  const q3 = sorted[q3Index] ?? 0;
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

export function anomalyCheck(dataset: AnomalyCheckDataset): AnalysisResult {
  const values = dataset.values;
  const zThreshold = dataset.threshold ?? 2.5;

  if (values.length < 3) {
    return {
      operation: "anomaly_check",
      values: { anomalyCount: 0, mean: 0, stdDev: 0, maxZScore: 0, threshold: zThreshold },
      evidence: ["At least 3 values are required for anomaly detection."],
      confidence: "low",
      dataQuality: "insufficient",
    };
  }

  const m = mean(values);
  const s = stdDev(values);
  const { lower: iqrLower, upper: iqrUpper } = iqrThreshold(values);

  const anomalyIndices: number[] = [];
  const anomalyValues: number[] = [];
  const zScores: number[] = [];
  let maxZ = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    const z = s === 0 ? 0 : Math.abs((value - m) / s);
    const isZAnomaly = z >= zThreshold;
    const isIqrAnomaly = value < iqrLower || value > iqrUpper;
    maxZ = Math.max(maxZ, z);
    zScores.push(Math.round(z * 100) / 100);
    if (isZAnomaly || isIqrAnomaly) {
      anomalyIndices.push(i);
      anomalyValues.push(value);
    }
  }

  return {
    operation: "anomaly_check",
    values: {
      anomalyCount: anomalyIndices.length,
      mean: Math.round(m * 100) / 100,
      stdDev: Math.round(s * 100) / 100,
      maxZScore: Math.round(maxZ * 100) / 100,
      threshold: zThreshold,
    },
    series: [
      { label: "values", data: values },
      { label: "zScores", data: zScores },
      { label: "anomalyValues", data: anomalyValues },
      { label: "anomalyIndices", data: anomalyIndices },
    ],
    evidence: [
      `Mean ${m.toFixed(2)} with std-dev ${s.toFixed(2)}`,
      `Max z-score ${maxZ.toFixed(2)} against threshold ${zThreshold}`,
      `IQR bounds ${iqrLower.toFixed(2)} – ${iqrUpper.toFixed(2)}`,
      `Found ${anomalyIndices.length} anomalies`,
    ],
    confidence: values.length >= 14 ? "high" : values.length >= 7 ? "medium" : "low",
    dataQuality: values.length >= 7 ? "live" : "insufficient",
  };
}

import { mean } from "./stats";
import type { AnalysisResult } from "../../domain/analysis";

export interface ComparePeriodDataset {
  current: number[];
  previous: number[];
}

export function comparePeriod(dataset: ComparePeriodDataset): AnalysisResult {
  const current = dataset.current;
  const previous = dataset.previous;
  const currentMean = current.length > 0 ? mean(current) : 0;
  const previousMean = previous.length > 0 ? mean(previous) : 0;
  const delta = currentMean - previousMean;
  const percentChange = previousMean !== 0 ? (delta / previousMean) * 100 : 0;
  const direction = delta > 0.0001 ? 1 : delta < -0.0001 ? -1 : 0;

  return {
    operation: "compare_period",
    values: {
      currentMean: Math.round(currentMean * 100) / 100,
      previousMean: Math.round(previousMean * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      percentChange: Math.round(percentChange * 100) / 100,
      direction,
      currentCount: current.length,
      previousCount: previous.length,
    },
    evidence: [
      `Current period mean ${currentMean.toFixed(2)} across ${current.length} values`,
      `Previous period mean ${previousMean.toFixed(2)} across ${previous.length} values`,
      `Delta ${delta.toFixed(2)} (${percentChange.toFixed(2)}%)`,
      direction === 1 ? "Trend: up" : direction === -1 ? "Trend: down" : "Trend: flat",
    ],
    confidence:
      current.length >= 8 && previous.length >= 8 ? "high" : current.length >= 3 && previous.length >= 3 ? "medium" : "low",
    dataQuality: current.length >= 3 && previous.length >= 3 ? "live" : "insufficient",
  };
}

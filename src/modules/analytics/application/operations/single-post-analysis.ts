import { zScore, percentileRank, engagementScore, type ScoredPost } from "./stats";
import type { AnalysisOperation, AnalysisResult } from "../../domain/analysis";

export interface SinglePostDataset {
  target: ScoredPost;
  baseline: ScoredPost[];
}

export function singlePostAnalysis(dataset: SinglePostDataset): AnalysisResult {
  const targetScore = engagementScore(dataset.target);
  const baselineScores = dataset.baseline.map(engagementScore).sort((a, b) => a - b);
  const percentile = baselineScores.length > 0 ? percentileRank(baselineScores, targetScore) : 50;
  const z = baselineScores.length > 1 ? zScore(baselineScores, targetScore) : 0;

  const verdict = percentile >= 75 ? "over" : percentile <= 25 ? "under" : "average";

  return {
    operation: "single_post_analysis" as AnalysisOperation,
    values: {
      engagementScore: Math.round(targetScore * 100) / 100,
      percentile,
      zScore: Math.round(z * 100) / 100,
      baselineCount: dataset.baseline.length,
      baselineMean: baselineScores.length > 0 ? Math.round((baselineScores.reduce((s, v) => s + v, 0) / baselineScores.length) * 100) / 100 : 0,
    },
    evidence: [
      `Engagement score ${targetScore.toFixed(2)} vs ${baselineScores.length} recent posts`,
      `Percentile rank ${percentile}`,
      `z-score ${z.toFixed(2)} against account baseline`,
      `Verdict: ${verdict}-performed`,
    ],
    confidence:
      baselineScores.length >= 8 ? "high" : baselineScores.length >= 3 ? "medium" : "low",
    dataQuality: baselineScores.length >= 3 ? "live" : "insufficient",
  };
}

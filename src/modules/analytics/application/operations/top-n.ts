import { engagementScore, topN as topNHelper, type ScoredPost } from "./stats";
import type { AnalysisResult } from "../../domain/analysis";

export interface TopNDataset {
  posts: ScoredPost[];
}

export function topNPosts(dataset: TopNDataset, limit = 5): AnalysisResult {
  const selected = topNHelper(dataset.posts, engagementScore, limit);
  const allScores = dataset.posts.map(engagementScore).sort((a, b) => a - b);

  const series = selected.map((post, index) => ({
    label: `rank-${index + 1}`,
    data: [engagementScore(post)],
  }));

  return {
    operation: "top_n",
    values: {
      count: selected.length,
      topScore: selected.length > 0 ? Math.round(engagementScore(selected[0]) * 100) / 100 : 0,
      meanScore: allScores.length > 0 ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 100) / 100 : 0,
    },
    series,
    evidence: selected.map((post, index) => `Rank ${index + 1}: ${post.id} scored ${engagementScore(post).toFixed(2)}`),
    confidence:
      dataset.posts.length >= 8 ? "high" : dataset.posts.length >= 3 ? "medium" : "low",
    dataQuality: dataset.posts.length >= 3 ? "live" : "insufficient",
  };
}

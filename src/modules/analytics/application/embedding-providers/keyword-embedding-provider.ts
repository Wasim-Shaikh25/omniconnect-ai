import type { EmbeddingProvider } from "../embedding-provider";

const VOCABULARY: string[] = [
  // single_post_analysis
  "post", "reel", "video", "perform", "how", "did", "single", "analysis", "verdict",
  // top_n
  "top", "best", "rank", "leading", "highest", "most", "performing",
  // compare_period
  "compare", "period", "versus", "vs", "last", "week", "month", "change", "delta", "previous",
  // anomaly_check
  "anomaly", "outlier", "unusual", "spike", "drop", "unexpected", "abnormal",
  // cohort_trend
  "trend", "growth", "decline", "slope", "over", "time", "forecast", "predict",
  // attribution_breakdown
  "attribution", "revenue", "orders", "coupon", "channel", "media", "source", "contributed",
  // best_time
  "best", "time", "post", "hour", "day", "schedule", "when", "optimal",
  // correlation
  "correlation", "relate", "relationship", "correlate", "between", "two", "metrics",
  // profile_quality
  "profile", "audience", "quality", "authentic", "influencer", "trust", "spam", "fake",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function buildVector(tokens: string[]): number[] {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return VOCABULARY.map((term) => counts.get(term) ?? 0);
}

export const keywordEmbeddingProvider: EmbeddingProvider = {
  async embed(text: string): Promise<number[]> {
    return buildVector(tokenize(text));
  },

  cosine(a: number[], b: number[]): number {
    let dot = 0;
    let aMag = 0;
    let bMag = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      aMag += a[i]! * a[i]!;
      bMag += b[i]! * b[i]!;
    }
    if (aMag === 0 || bMag === 0) return 0;
    return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
  },
};

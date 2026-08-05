import type { AnalysisSpec, AnalysisOperation, MetricName } from "@/modules/analytics/pure";
import type { EmbeddingProvider } from "@/modules/analytics/pure";

export interface ResolvedOperation {
  spec: AnalysisSpec;
  confidence: number;
}

export interface UnsupportedOperation {
  unsupported: true;
  reason: string;
}

export type ResolveResult = ResolvedOperation | UnsupportedOperation;

export interface OperationExemplar {
  operation: AnalysisOperation;
  terms: string[];
  defaultMetrics: MetricName[];
}

const DEFAULT_TOP_N = 5;

const OPERATION_EXEMPLARS: OperationExemplar[] = [
  { operation: "single_post_analysis", terms: ["post", "reel", "video", "perform", "how did", "single", "analysis", "verdict"], defaultMetrics: ["engagement"] },
  { operation: "top_n", terms: ["top", "best", "rank", "leading", "highest", "most performing"], defaultMetrics: ["engagement"] },
  { operation: "compare_period", terms: ["compare", "period", "versus", "last week", "last month", "change", "delta", "previous"], defaultMetrics: ["revenue", "orders"] },
  { operation: "anomaly_check", terms: ["anomaly", "outlier", "unusual", "spike", "drop", "unexpected", "abnormal"], defaultMetrics: ["revenue"] },
  { operation: "cohort_trend", terms: ["trend", "growth", "decline", "slope", "over time", "forecast", "predict"], defaultMetrics: ["engagement"] },
  { operation: "attribution_breakdown", terms: ["attribution", "revenue", "orders", "coupon", "channel", "media", "source", "contributed"], defaultMetrics: ["revenue", "orders"] },
  { operation: "best_time", terms: ["best time", "post", "hour", "day", "schedule", "when", "optimal"], defaultMetrics: ["engagement", "revenue"] },
  { operation: "correlation", terms: ["correlation", "relate", "relationship", "correlate", "between"], defaultMetrics: ["engagement", "revenue"] },
  { operation: "profile_quality", terms: ["profile", "audience", "quality", "authentic", "influencer", "trust", "spam", "fake"], defaultMetrics: ["followers"] },
];

const RESOLVE_THRESHOLD = 0.25;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function termOverlapScore(questionTokens: string[], exemplarTerms: string[]): number {
  const tokenSet = new Set(questionTokens);
  const matches = exemplarTerms.filter((term) => tokenSet.has(term)).length;
  return matches / exemplarTerms.length;
}

function extractTopN(questionTokens: string[]): number | undefined {
  for (const token of questionTokens) {
    const num = Number.parseInt(token, 10);
    if (!Number.isNaN(num) && num > 0 && num <= 100) {
      return num;
    }
  }
  return undefined;
}

function buildSpec(operation: AnalysisOperation, metrics: MetricName[], topN?: number): AnalysisSpec {
  return {
    operation,
    target: {},
    metrics,
    topN: operation === "top_n" || topN !== undefined ? (topN ?? DEFAULT_TOP_N) : undefined,
  };
}

export async function resolveOperation(
  question: string,
  embeddings: EmbeddingProvider
): Promise<ResolveResult> {
  const questionTokens = tokenize(question);
  const questionVector = await embeddings.embed(question);

  const exemplarVectors = await Promise.all(
    OPERATION_EXEMPLARS.map((ex) => embeddings.embed(ex.terms.join(" ")))
  );

  let best: { exemplar: OperationExemplar; score: number } | null = null;
  for (let i = 0; i < OPERATION_EXEMPLARS.length; i++) {
    const exemplar = OPERATION_EXEMPLARS[i]!;
    const vector = exemplarVectors[i]!;
    const cosine = embeddings.cosine(questionVector, vector);
    const overlap = termOverlapScore(questionTokens, exemplar.terms);
    const score = cosine * 0.6 + overlap * 0.4;
    if (!best || score > best.score) {
      best = { exemplar, score };
    }
  }

  if (!best || best.score < RESOLVE_THRESHOLD) {
    return { unsupported: true, reason: "No supported analysis matches this question." };
  }

  const topN = extractTopN(questionTokens);
  const spec = buildSpec(best.exemplar.operation, best.exemplar.defaultMetrics, topN);

  return { spec, confidence: Math.round(best.score * 1000) / 1000 };
}

export type AnalysisOperation =
  | "single_post_analysis"
  | "top_n"
  | "compare_period"
  | "anomaly_check"
  | "cohort_trend"
  | "attribution_breakdown"
  | "best_time"
  | "correlation"
  | "profile_quality";

export type MetricName =
  | "engagement"
  | "reach"
  | "impressions"
  | "saves"
  | "shares"
  | "orders"
  | "revenue"
  | "aov"
  | "followers"
  | "conversion_rate";

export interface AnalysisSpec {
  operation: AnalysisOperation;
  target: {
    postId?: string;
    entityType?: "post" | "product" | "coupon" | "channel" | "customer";
    entityId?: string;
    dateRange?: { from: string; to: string };
    compareTo?: { from: string; to: string };
  };
  metrics: MetricName[];
  groupBy?: "day" | "week" | "media_type" | "channel" | "coupon";
  filters?: Record<string, string | number | boolean>;
  topN?: number;
}

export interface AnalysisResult {
  operation: AnalysisOperation;
  values: Record<string, number>;
  series?: Array<{ label: string; data: number[] }>;
  evidence: string[];
  confidence: "high" | "medium" | "low";
  dataQuality: "live" | "partial" | "insufficient";
}

export class UnsupportedOperationError extends Error {
  constructor(public readonly operation: string) {
    super(`Unsupported analysis operation: ${operation}`);
  }
}

const VALID_OPERATIONS: ReadonlySet<string> = new Set<AnalysisOperation>([
  "single_post_analysis",
  "top_n",
  "compare_period",
  "anomaly_check",
  "cohort_trend",
  "attribution_breakdown",
  "best_time",
  "correlation",
  "profile_quality",
]);

export function validateSpec(spec: AnalysisSpec): void {
  if (!spec || typeof spec !== "object") {
    throw new Error("AnalysisSpec must be an object");
  }
  if (!VALID_OPERATIONS.has(spec.operation)) {
    throw new UnsupportedOperationError(spec.operation);
  }
  if (!Array.isArray(spec.metrics) || spec.metrics.length === 0) {
    throw new Error("AnalysisSpec.metrics must be a non-empty array");
  }
  if (spec.topN !== undefined && (!Number.isInteger(spec.topN) || spec.topN <= 0)) {
    throw new Error("AnalysisSpec.topN must be a positive integer");
  }
  if (spec.target && typeof spec.target !== "object") {
    throw new Error("AnalysisSpec.target must be an object");
  }
}

import { resolveOperation } from "@/modules/ai";
import { generateDashboard } from "@/modules/ai";
import type { GenerateDashboardResult } from "@/modules/ai";
import type { AnalysisSpec } from "../domain/analysis";
import type { AnalysisEngineOperations, DatasetFetcher } from "./analysis-engine";
import { makeAnalysisEngine } from "./analysis-engine";
import { singlePostAnalysis } from "./operations/single-post-analysis";
import type { SinglePostDataset } from "./operations/single-post-analysis";
import { topNPosts } from "./operations/top-n";
import type { TopNDataset } from "./operations/top-n";
import { bestTime } from "./operations/best-time";
import type { BestTimeDataset } from "./operations/best-time";
import { comparePeriod } from "./operations/compare-period";
import type { ComparePeriodDataset } from "./operations/compare-period";
import { anomalyCheck } from "./operations/anomaly-check";
import type { AnomalyCheckDataset } from "./operations/anomaly-check";
import { cohortTrend } from "./operations/cohort-trend";
import type { CohortTrendDataset } from "./operations/cohort-trend";
import { attributionBreakdown } from "./operations/attribution-breakdown";
import type { AttributionBreakdownDataset } from "./operations/attribution-breakdown";
import { correlation as correlationOp } from "./operations/correlation";
import type { CorrelationDataset } from "./operations/correlation";
import { profileQuality } from "./operations/profile-quality";
import type { ProfileQualityDataset } from "./operations/profile-quality";
import { keywordEmbeddingProvider } from "./embedding-providers/keyword-embedding-provider";

export interface QueryAnalyticsInput {
  question: string;
  projectId: string;
}

export type QueryAnalyticsDashboardResult = GenerateDashboardResult;

export interface QueryAnalyticsDeps {
  fetchDataset: DatasetFetcher;
}

function typedLimit(spec: AnalysisSpec): number {
  if (spec.topN !== undefined && Number.isInteger(spec.topN) && spec.topN > 0) {
    return spec.topN;
  }
  if (spec.target?.entityType === "post" && typeof spec.target.entityId === "string") {
    const parsed = Number.parseInt(spec.target.entityId, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 5;
}

export function makeQueryAnalytics(deps: QueryAnalyticsDeps) {
  const operations: AnalysisEngineOperations = {
    single_post_analysis: (dataset) => singlePostAnalysis(dataset as SinglePostDataset),
    top_n: (dataset, spec) => topNPosts(dataset as TopNDataset, typedLimit(spec)),
    best_time: (dataset, spec) => bestTime(dataset as BestTimeDataset, { topN: typedLimit(spec) }),
    compare_period: (dataset) => comparePeriod(dataset as ComparePeriodDataset),
    anomaly_check: (dataset) => anomalyCheck(dataset as AnomalyCheckDataset),
    cohort_trend: (dataset) => cohortTrend(dataset as CohortTrendDataset),
    attribution_breakdown: (dataset) => attributionBreakdown(dataset as AttributionBreakdownDataset),
    correlation: (dataset) => correlationOp(dataset as CorrelationDataset),
    profile_quality: (dataset) => profileQuality(dataset as ProfileQualityDataset),
  };

  const engine = makeAnalysisEngine({ fetchDataset: deps.fetchDataset, operations });

  return async function queryAnalytics({
    question,
    projectId,
  }: QueryAnalyticsInput): Promise<QueryAnalyticsDashboardResult> {
    const resolved = await resolveOperation(question, keywordEmbeddingProvider);

    if ("unsupported" in resolved) {
      return { unsupported: true, reason: resolved.reason };
    }

    const result = await engine.run(resolved.spec, { projectId });
    return generateDashboard({ result });
  };
}

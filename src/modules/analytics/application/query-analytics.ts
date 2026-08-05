import { resolveOperation } from "@/modules/ai";
import { generateDashboard } from "@/modules/ai";
import type { GenerateDashboardResult } from "@/modules/ai";
import type { AnalysisEngineOperations } from "./analysis-engine";
import { makeAnalysisEngine } from "./analysis-engine";
import { singlePostAnalysis } from "./operations/single-post-analysis";
import { topNPosts } from "./operations/top-n";
import { bestTime } from "./operations/best-time";
import { comparePeriod } from "./operations/compare-period";
import { anomalyCheck } from "./operations/anomaly-check";
import { cohortTrend } from "./operations/cohort-trend";
import { attributionBreakdown } from "./operations/attribution-breakdown";
import { correlation as correlationOp } from "./operations/correlation";
import { profileQuality } from "./operations/profile-quality";
import { keywordEmbeddingProvider } from "./embedding-providers/keyword-embedding-provider";
import { makePrismaDatasetFetcher } from "../infrastructure/prisma-dataset-fetcher";
import type { PrismaDatasetFetcherDeps } from "../infrastructure/prisma-dataset-fetcher";

export interface QueryAnalyticsInput {
  question: string;
  projectId: string;
}

export type QueryAnalyticsDashboardResult = GenerateDashboardResult;

export function makeQueryAnalytics(deps: PrismaDatasetFetcherDeps) {
  const fetchDataset = makePrismaDatasetFetcher(deps);
  const operations: AnalysisEngineOperations = {
    single_post_analysis: singlePostAnalysis as unknown as AnalysisEngineOperations["single_post_analysis"],
    top_n: topNPosts as unknown as AnalysisEngineOperations["top_n"],
    best_time: bestTime as unknown as AnalysisEngineOperations["best_time"],
    compare_period: comparePeriod as unknown as AnalysisEngineOperations["compare_period"],
    anomaly_check: anomalyCheck as unknown as AnalysisEngineOperations["anomaly_check"],
    cohort_trend: cohortTrend as unknown as AnalysisEngineOperations["cohort_trend"],
    attribution_breakdown: attributionBreakdown as unknown as AnalysisEngineOperations["attribution_breakdown"],
    correlation: correlationOp as unknown as AnalysisEngineOperations["correlation"],
    profile_quality: profileQuality as unknown as AnalysisEngineOperations["profile_quality"],
  };

  const engine = makeAnalysisEngine({ fetchDataset, operations });

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

/**
 * Pure, side-effect-free analytics exports.
 *
 * This barrel is safe to import in unit tests and client bundles because it
 * does not load presentation actions or Next.js server-only modules.
 */

export type { AnalysisOperation, MetricName, AnalysisSpec, AnalysisResult } from "./domain/analysis";
export type { MediaPost } from "./domain/types";
export { UnsupportedOperationError, validateSpec } from "./domain/analysis";
export type { AnalysisContext } from "./application/analysis-engine";
export { makeAnalysisEngine } from "./application/analysis-engine";
export { singlePostAnalysis } from "./application/operations/single-post-analysis";
export { bestTime, bestTimeLabel } from "./application/operations/best-time";
export type { BestTimeWindow } from "./application/best-time-to-post";
export { topNPosts } from "./application/operations/top-n";
export { comparePeriod } from "./application/operations/compare-period";
export { anomalyCheck } from "./application/operations/anomaly-check";
export { correlation as correlationOp } from "./application/operations/correlation";
export { cohortTrend } from "./application/operations/cohort-trend";
export { attributionBreakdown } from "./application/operations/attribution-breakdown";
export { profileQuality } from "./application/operations/profile-quality";
export { engagementScore, percentileRank, zScore, topN, correlation, mean, stdDev, median } from "./application/operations/stats";
export type { ScoredPost } from "./application/operations/stats";

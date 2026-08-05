/**
 * Analytics module — public barrel.
 *
 * Client-safe entry point: domain types, repository interfaces, and server actions.
 */
export const MODULE_NAME = "analytics" as const;

export type {
  TrackedAccountRecord,
  SuggestedCompetitor,
  CreateTrackedAccountInput,
  UpdateTrackedAccountInput,
  TrackedAccountRepository,
} from "./application/ports";
export type {
  WorkspaceKpiSnapshot,
  AnalyticsQueries,
} from "./application/queries";
export type {
  MarketingPerformanceView,
  MediaPost,
  MediaInsight,
  AccountInsight,
  TrendSnapshot,
  ContentRecommendation,
  Report,
  MediaAnalysis,
} from "./domain/types";

export type { AnalysisOperation, MetricName, AnalysisSpec, AnalysisResult } from "./domain/analysis";
export { UnsupportedOperationError, validateSpec } from "./domain/analysis";
export type { AnalysisContext, AnalysisEngine, DatasetFetcher, AnalysisEngineOperations } from "./application/analysis-engine";
export { makeAnalysisEngine } from "./application/analysis-engine";
export type { EmbeddingProvider } from "./application/embedding-provider";
export { keywordEmbeddingProvider } from "./application/embedding-providers/keyword-embedding-provider";
export { TransformersEmbeddingProvider } from "./infrastructure/transformers-embedding-provider";
export type { TransformersEmbeddingProviderConfig } from "./infrastructure/transformers-embedding-provider";
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
export type { GetMarketingPerformance } from "./application/marketing-analytics";
export type { CompetitorBenchmark, GetCompetitorBenchmark, WorkspaceCompetitorComparison, GetWorkspaceCompetitorComparison } from "./application/competitor-benchmark";

export {
  MarketingPerformanceUpdated,
  CompetitorChangeDetected,
  CompetitorBenchmarkReady,
  AccountAnalyticsSynced,
  MediaAnalyticsSynced,
  TrendingHashtagDiscovered,
  CompetitorContentSynced,
  ReportGenerated,
  ContentRecommendationCreated,
} from "./domain/events";

export type { MarketingInsightsRepository } from "./application/ports";

export {
  trackCompetitorAction,
  listTrackedCompetitorsAction,
  getCompetitorMediaAction,
  analyzeCompetitorAction,
  deleteTrackedCompetitorAction,
  discoverCompetitorsAction,
  getMarketingPerformanceAction,
  getCompetitorBenchmarkAction,
  getWorkspaceCompetitorComparisonAction,
  getBestTimeToPostAction,
  getContentCalendarAction,
  syncMediaCatalogAction,
  syncAccountAnalyticsAction,
  searchTrendingHashtagsAction,
  analyzeMediaAction,
  generateReportAction,
  createContentRecommendationAction,
  listMediaPostsAction,
  getMediaPostAction,
  listTrendSnapshotsAction,
  listContentRecommendationsAction,
  listReportsAction,
} from "./presentation/actions";
export type {
  TrackCompetitorState,
  ListCompetitorsState,
  CompetitorMediaState,
  CompetitorAnalysisState,
  DiscoverCompetitorsState,
  MarketingPerformanceState,
  CompetitorBenchmarkState,
  WorkspaceCompetitorComparisonState,
  BestTimeToPostState,
  ContentCalendarState,
  SyncMediaCatalogState,
  SyncAccountAnalyticsState,
  SearchTrendingHashtagsState,
  AnalyzeMediaState,
  GenerateReportState,
  CreateContentRecommendationState,
  ListMediaPostsState,
  GetMediaPostState,
  ListTrendSnapshotsState,
  ListContentRecommendationsState,
  ListReportsState,
} from "./presentation/actions";

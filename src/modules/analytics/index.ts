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
export type { AnalysisContext } from "./application/analysis-engine";
export { makeAnalysisEngine } from "./application/analysis-engine";
export { singlePostAnalysis } from "./application/operations/single-post-analysis";
export { engagementScore, percentileRank, zScore, topN, correlation, mean, stdDev } from "./application/operations/stats";
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

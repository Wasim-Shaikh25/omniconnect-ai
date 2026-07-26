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
export type { MarketingPerformanceView } from "./domain/types";
export type { GetMarketingPerformance } from "./application/marketing-analytics";
export type { CompetitorBenchmark, GetCompetitorBenchmark, WorkspaceCompetitorComparison, GetWorkspaceCompetitorComparison } from "./application/competitor-benchmark";

export {
  MarketingPerformanceUpdated,
  CompetitorChangeDetected,
  CompetitorBenchmarkReady,
} from "./domain/events";

export { analyticsQueries, getCompetitorBenchmark } from "./infrastructure/container";

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
} from "./presentation/actions";

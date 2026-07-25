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

export {
  trackCompetitorAction,
  listTrackedCompetitorsAction,
  getCompetitorMediaAction,
  analyzeCompetitorAction,
  deleteTrackedCompetitorAction,
  discoverCompetitorsAction,
} from "./presentation/actions";
export type {
  TrackCompetitorState,
  ListCompetitorsState,
  CompetitorMediaState,
  CompetitorAnalysisState,
  DiscoverCompetitorsState,
} from "./presentation/actions";

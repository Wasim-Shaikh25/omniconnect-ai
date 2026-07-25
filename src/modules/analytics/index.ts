/**
 * Analytics module — public barrel.
 *
 * Client-safe entry point: domain types, repository interfaces, and server actions.
 */
export const MODULE_NAME = "analytics" as const;

export type {
  TrackedAccountRecord,
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
} from "./presentation/actions";
export type {
  TrackCompetitorState,
  ListCompetitorsState,
  CompetitorMediaState,
  CompetitorAnalysisState,
} from "./presentation/actions";

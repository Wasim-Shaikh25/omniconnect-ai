export const MODULE_NAME = "inspector" as const;

export type {
  PublicProfile,
  PublicMedia,
  PublicComment,
  ProfileInspectionResult,
  DemographicEstimate,
  AudienceQuality,
  TopContentItem,
  GrowthTrend,
} from "./domain/types";

export type { ProfileFetcher, ProfileNarrator } from "./application/ports";
export { inspectProfile } from "./application/inspect-profile";
export type { InspectProfileDeps } from "./application/inspect-profile";
export { deterministicProfileNarrator } from "./application/deterministic-narrator";

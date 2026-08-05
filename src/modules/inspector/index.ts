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
export { makeOpenRouterProfileNarrator } from "./infrastructure/open-router-profile-narrator";
export type { OpenRouterProfileNarratorConfig } from "./infrastructure/open-router-profile-narrator";
export { makeMetaProfileFetcher, NoMetaAccessError, ProfileNotFoundError, MetaApiError } from "./infrastructure/meta-profile-fetcher";
export type { MetaProfileFetcherConfig } from "./infrastructure/meta-profile-fetcher";

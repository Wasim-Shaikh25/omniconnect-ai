import type { ProfileInspectionResult, PublicProfile, DemographicEstimate } from "../domain/types";

export interface ProfileFetcher {
  fetch(username: string, projectId: string): Promise<PublicProfile | null>;
}

export interface ProfileNarrator {
  narrate(result: Omit<ProfileInspectionResult, "narration">): Promise<string>;
}

export interface DemographicEstimator {
  estimate(profile: PublicProfile): Promise<DemographicEstimate>;
}

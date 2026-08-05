import type { ProfileInspectionResult, PublicProfile } from "../domain/types";

export interface ProfileFetcher {
  fetch(username: string, projectId: string): Promise<PublicProfile | null>;
}

export interface ProfileNarrator {
  narrate(result: Omit<ProfileInspectionResult, "narration">): Promise<string>;
}

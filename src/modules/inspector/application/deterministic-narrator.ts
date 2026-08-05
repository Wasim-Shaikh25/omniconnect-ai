import type { ProfileInspectionResult } from "../domain/types";
import type { ProfileNarrator } from "./ports";

export const deterministicProfileNarrator: ProfileNarrator = {
  async narrate(result: Omit<ProfileInspectionResult, "narration">): Promise<string> {
    return [
      `Profile @${result.username} has ${result.followerCount.toLocaleString()} followers with an engagement rate of ${(result.engagementRate * 100).toFixed(2)}%.`,
      `Audience quality is ${result.audienceQuality.label} (score ${(result.audienceQuality.score * 100).toFixed(0)}/100, confidence ${(result.audienceQuality.confidence * 100).toFixed(0)}%).`,
      `Top content is ${result.topContent[0]?.type ?? "unknown"} with engagement ${result.topContent[0]?.engagement ?? 0}.`,
      `Recent growth trend is ${result.growthTrend}.`,
      `Demographic confidence is ${result.demographics.confidence}; geo signals point to ${result.demographics.topCities[0]?.city ?? "unknown"} and ${result.demographics.topCountries[0]?.country ?? "unknown"}.`,
    ].join(" ");
  },
};

import type { RecommendationRecord } from "./types";

export interface ExecutableCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Pure domain invariant: a recommendation can only be executed if it is not
 * expired, invalidated, or already in a terminal state.
 */
export function canExecuteRecommendation(
  recommendation: RecommendationRecord | null | undefined,
  now: Date = new Date(),
): ExecutableCheck {
  if (!recommendation) {
    return { ok: false, reason: "Recommendation not found" };
  }

  if (recommendation.status === "EXPIRED" || recommendation.status === "DISMISSED") {
    return { ok: false, reason: `Recommendation is ${recommendation.status.toLowerCase()}` };
  }

  if (recommendation.invalidatedAt) {
    return { ok: false, reason: "Recommendation was invalidated" };
  }

  if (recommendation.validFrom.getTime() > now.getTime()) {
    return { ok: false, reason: "Recommendation is not yet valid" };
  }

  if (recommendation.validUntil && recommendation.validUntil.getTime() < now.getTime()) {
    return { ok: false, reason: "Recommendation has expired" };
  }

  return { ok: true };
}

export function isRecommendationExpired(
  recommendation: RecommendationRecord,
  now: Date = new Date(),
): boolean {
  return (
    recommendation.status === "EXPIRED" ||
    !!recommendation.invalidatedAt ||
    (recommendation.validUntil !== null && recommendation.validUntil.getTime() < now.getTime())
  );
}

import type { BusinessObjective } from "./types";

/**
 * Default objective priority for conflict resolution (spec 0050 §14):
 * revenue > retention > growth > engagement > brand > support.
 * Lower number = higher priority. Configurable per workspace by overriding.
 */
export const OBJECTIVE_PRIORITY: Record<BusinessObjective, number> = {
  REVENUE: 0,
  RETENTION: 1,
  GROWTH: 2,
  ENGAGEMENT: 3,
  BRAND: 4,
  SUPPORT: 5,
};

export const ALL_OBJECTIVES: BusinessObjective[] = [
  "GROWTH",
  "REVENUE",
  "ENGAGEMENT",
  "RETENTION",
  "SUPPORT",
  "BRAND",
];

export function objectivePriority(objective: BusinessObjective): number {
  return OBJECTIVE_PRIORITY[objective];
}

/**
 * Pure classification of a recommendation into a business objective from its
 * reason codes and free-text objective. Deterministic and side-effect free.
 */
export function inferBusinessObjective(
  reasonCodes: string[],
  objectiveText: string | null,
): BusinessObjective {
  const haystack = `${reasonCodes.join(" ")} ${objectiveText ?? ""}`.toLowerCase();

  const matches = (...needles: string[]) => needles.some((n) => haystack.includes(n));

  if (matches("revenue", "aov", "order", "conversion", "checkout", "coupon", "discount", "sales")) {
    return "REVENUE";
  }
  if (matches("churn", "retention", "re-engage", "reactivation", "repeat", "loyal", "win_back", "winback")) {
    return "RETENTION";
  }
  if (matches("follower", "growth", "audience", "reach", "acquire", "discover")) {
    return "GROWTH";
  }
  if (matches("objection", "complaint", "support", "question", "answer", "help")) {
    return matches("complaint", "objection") ? "SUPPORT" : "ENGAGEMENT";
  }
  if (matches("engagement", "comment", "dm_pattern", "dm pattern", "responses", "social_proof")) {
    return "ENGAGEMENT";
  }
  if (matches("brand", "ugc", "ambassador", "awareness")) {
    return "BRAND";
  }
  return "ENGAGEMENT";
}

export type DiagnosisCause = "MARKET_TREND" | "COMPETITOR_ADVANTAGE" | "SELF_MISTAKE" | "UNKNOWN";

export interface RecommendationContext {
  reasoning: string;
  marketContext: string | null;
  competitorContext: string | null;
  selfContext: string | null;
  primaryCause: DiagnosisCause;
}

/**
 * Diagnoses whether a change is driven by a market trend, a competitor's
 * advantage, or the store's own mistake, from the available signals. Pure.
 */
export function diagnoseRecommendationContext(input: {
  reasonCodes: string[];
  marketTrendDelta?: number | null;
  competitorDelta?: number | null;
  selfDelta?: number | null;
}): RecommendationContext {
  const { reasonCodes } = input;
  const marketTrendDelta = input.marketTrendDelta ?? null;
  const competitorDelta = input.competitorDelta ?? null;
  const selfDelta = input.selfDelta ?? null;

  const marketContext =
    marketTrendDelta !== null
      ? `Market demand moved ${formatDelta(marketTrendDelta)} vs the prior period.`
      : null;
  const competitorContext =
    competitorDelta !== null
      ? `Tracked competitors are ${formatDelta(competitorDelta)} on comparable metrics.`
      : null;
  const selfContext =
    selfDelta !== null
      ? `Your own performance changed ${formatDelta(selfDelta)} vs your baseline.`
      : null;

  const magnitudes: Array<{ cause: DiagnosisCause; value: number }> = (
    [
      { cause: "MARKET_TREND", value: Math.abs(marketTrendDelta ?? 0) },
      { cause: "COMPETITOR_ADVANTAGE", value: Math.abs(competitorDelta ?? 0) },
      { cause: "SELF_MISTAKE", value: Math.abs(selfDelta ?? 0) },
    ] satisfies Array<{ cause: DiagnosisCause; value: number }>
  ).filter((m) => m.value > 0);

  let primaryCause: DiagnosisCause = "UNKNOWN";
  if (magnitudes.length > 0) {
    magnitudes.sort((a, b) => b.value - a.value);
    primaryCause = magnitudes[0].cause;
  } else if (reasonCodes.includes("stale_data") || reasonCodes.includes("integration_health")) {
    primaryCause = "SELF_MISTAKE";
  }

  const reasoningByCause: Record<DiagnosisCause, string> = {
    MARKET_TREND: "The dominant driver is a shift in overall market demand, not your execution.",
    COMPETITOR_ADVANTAGE: "A competitor is outperforming you on the key metric — respond directly.",
    SELF_MISTAKE: "The change is driven by your own execution or data hygiene — fixable in-house.",
    UNKNOWN: "Insufficient comparative signal; treating this as a store-level opportunity.",
  };

  return {
    reasoning: reasoningByCause[primaryCause],
    marketContext,
    competitorContext,
    selfContext,
    primaryCause,
  };
}

function formatDelta(delta: number): string {
  const pct = Math.round(delta * 100);
  if (pct === 0) return "flat";
  return pct > 0 ? `up ${pct}%` : `down ${Math.abs(pct)}%`;
}

/**
 * Recomputes a confidence score as new signals arrive. Confidence trends toward
 * the observed evidence ratio, weighted by the number of supporting signals
 * (more signals → more weight). Pure and clamped to [0, 1].
 */
export function recalculateConfidence(input: {
  currentConfidence: number;
  currentSignals: number;
  supportingSignals: number;
  contradictingSignals: number;
}): { confidence: number; signals: number } {
  const { currentConfidence, currentSignals, supportingSignals, contradictingSignals } = input;
  const newSignals = supportingSignals + contradictingSignals;
  const totalSignals = currentSignals + newSignals;
  if (totalSignals === 0) {
    return { confidence: clamp01(currentConfidence), signals: 0 };
  }
  const evidenceRatio = newSignals === 0 ? currentConfidence : supportingSignals / newSignals;
  // Weighted average of prior confidence (weight = currentSignals + 1 prior) and new evidence.
  const priorWeight = currentSignals + 1;
  const blended = (currentConfidence * priorWeight + evidenceRatio * newSignals) / (priorWeight + newSignals);
  return { confidence: clamp01(blended), signals: totalSignals };
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

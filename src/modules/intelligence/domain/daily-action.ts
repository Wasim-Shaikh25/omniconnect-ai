import type { ActionOutcomeStatus, BusinessObjective } from "./types";
import { objectivePriority } from "./objective";

/**
 * Pure priority score for a daily action. Higher = surface first.
 * Combines business-objective priority (revenue-first), the recommendation's
 * own ranking score, and its confidence. Deterministic, side-effect free.
 */
export function computeActionPriority(input: {
  objective: BusinessObjective;
  confidence: number;
  recommendationScore: number;
}): number {
  const objectiveWeight = (6 - objectivePriority(input.objective)) * 10; // 60..10
  const confidenceWeight = clamp01(input.confidence) * 30;
  const recWeight = Math.max(0, input.recommendationScore);
  return Math.round((objectiveWeight + confidenceWeight + recWeight) * 100) / 100;
}

/**
 * Classifies whether the measured metric improved, held steady, or worsened
 * after an action, given before/after values and the objective's direction of
 * good (higher is better for all current objectives). Pure.
 */
export function classifyOutcome(
  before: number | null,
  after: number | null,
  minRelChange = 0.05,
): ActionOutcomeStatus {
  if (before === null || after === null) return "NO_CHANGE";
  if (before === 0) {
    if (after > 0) return "IMPROVED";
    return "NO_CHANGE";
  }
  const rel = (after - before) / Math.abs(before);
  if (rel >= minRelChange) return "IMPROVED";
  if (rel <= -minRelChange) return "WORSENED";
  return "NO_CHANGE";
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

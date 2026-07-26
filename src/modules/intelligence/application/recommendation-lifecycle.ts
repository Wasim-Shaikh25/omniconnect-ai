import { eventBus } from "@/shared/events";
import type { RecommendationRepository, RecommendationConflictRepository } from "./ports";
import type { RecommendationRecord, RecommendationConflictRecord } from "../domain/types";
import { RecommendationExpired, RecommendationConflictDetected } from "../domain/events";
import { isRecommendationExpired } from "../domain/recommendation";

export interface Conflict {
  recommendationId: string;
  title: string;
  module: string;
  priority: number;
}

export interface ConflictResolution {
  winnerId: string;
  reason: string;
  appliedPolicy: string;
  runnerUpId?: string;
}

export interface RecommendationLifecycleServiceInput {
  recommendations: RecommendationRepository;
  conflicts?: RecommendationConflictRepository;
  now?: Date;
}

export interface RankedRecommendation extends RecommendationRecord {
  score: number;
}

export function makeRecommendationLifecycleService(input: RecommendationLifecycleServiceInput) {
  const now = input.now ?? new Date();

  function scoreRecommendation(rec: RecommendationRecord): number {
    let score = 0;
    switch (rec.riskTier) {
      case "TIER_4":
        score += 40;
        break;
      case "TIER_3":
        score += 30;
        break;
      case "TIER_2":
        score += 20;
        break;
      default:
        score += 10;
    }
    if (rec.urgency === "HIGH") score += 25;
    if (rec.urgency === "MEDIUM") score += 15;
    if (rec.urgency === "LOW") score += 5;
    if (rec.confidence) score += rec.confidence * 20;
    if (rec.effort === "LOW") score += 10;
    if (rec.effort === "MEDIUM") score += 5;
    return score;
  }

  async function prioritizeRecommendations(
    organizationId: string,
    storeId?: string,
    limit = 20,
  ): Promise<RankedRecommendation[]> {
    const active = await input.recommendations.listActive(organizationId, storeId, 200);
    const ranked = active.map((rec) => ({ ...rec, score: scoreRecommendation(rec) }));
    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, limit);
  }

  function detectConflicts(recommendations: RecommendationRecord[]): Conflict[] {
    const conflicts: Conflict[] = [];
    for (const rec of recommendations) {
      const lowerTitle = rec.title.toLowerCase();
      if (lowerTitle.includes("coupon") || lowerTitle.includes("discount")) {
        conflicts.push({
          recommendationId: rec.id,
          title: rec.title,
          module: rec.producedByModule,
          priority: scoreRecommendation(rec),
        });
      }
    }
    return conflicts;
  }

  async function resolveConflicts(recommendations: RecommendationRecord[]): Promise<{
    ranked: RankedRecommendation[];
    resolutions: ConflictResolution[];
  }> {
    const ranked = recommendations
      .map((rec) => ({ ...rec, score: scoreRecommendation(rec) }))
      .sort((a, b) => b.score - a.score);
    const discountConflicts = detectConflicts(recommendations);
    const resolutions: ConflictResolution[] = [];

    if (discountConflicts.length > 1) {
      const sorted = discountConflicts.sort((a, b) => b.priority - a.priority);
      const winner = sorted[0];
      const runnerUp = sorted[1];
      const winnerRec = recommendations.find((r) => r.id === winner.recommendationId);
      const runnerUpRec = recommendations.find((r) => r.id === runnerUp?.recommendationId);
      const reason = `Selected highest-priority discount recommendation from ${winner.module} to avoid conflicting pricing actions.`;
      resolutions.push({
        winnerId: winner.recommendationId,
        reason,
        appliedPolicy: "single_discount_per_run",
        runnerUpId: runnerUp?.recommendationId,
      });

      if (input.conflicts && winnerRec) {
        await input.conflicts.save({
          organizationId: winnerRec.organizationId,
          storeId: winnerRec.storeId,
          winnerId: winner.recommendationId,
          runnerUpId: runnerUp?.recommendationId ?? null,
          winnerTitle: winnerRec.title,
          runnerUpTitle: runnerUpRec?.title ?? null,
          reason,
          appliedPolicy: "single_discount_per_run",
        });
      }

      await eventBus.publish(
        new RecommendationConflictDetected(winner.recommendationId, {
          winnerId: winner.recommendationId,
          runnerUpId: runnerUp?.recommendationId,
          reason: `Conflicting discount recommendations between ${winner.module} and ${runnerUp?.module ?? "another module"}.`,
          appliedPolicy: "single_discount_per_run",
        }),
      );
    }

    return { ranked, resolutions };
  }

  async function expireStaleRecommendations(organizationId: string): Promise<{ expired: string[]; skipped: string[] }> {
    const expired: string[] = [];
    const skipped: string[] = [];

    const allOpen = await input.recommendations.listOpen(organizationId, undefined, 500);
    for (const rec of allOpen) {
      if (isRecommendationExpired(rec, now)) {
        await input.recommendations.invalidate(rec.id, "RecommendationExpired");
        await eventBus.publish(
          new RecommendationExpired(rec.id, { recommendationId: rec.id, reason: "validUntil elapsed or recommendation invalidated" }),
        );
        expired.push(rec.id);
      } else {
        skipped.push(rec.id);
      }
    }

    return { expired, skipped };
  }

  async function getRecentConflicts(organizationId: string, storeId?: string, limit = 5): Promise<RecommendationConflictRecord[]> {
    if (!input.conflicts) return [];
    return input.conflicts.listRecent(organizationId, storeId, limit);
  }

  return {
    prioritizeRecommendations,
    resolveConflicts,
    expireStaleRecommendations,
    getRecentConflicts,
  };
}

export type RecommendationLifecycleService = ReturnType<typeof makeRecommendationLifecycleService>;

import { eventBus } from "@/shared/events";
import type { BusinessInsightRepository, HypothesisRepository } from "./ports";
import { HypothesisProposed } from "../domain/events";
import type { BusinessInsightRecord, HypothesisRecord } from "../domain/types";

export interface HypothesisServiceInput {
  insights: BusinessInsightRepository;
  hypotheses: HypothesisRepository;
}

function hypothesisFromInsight(insight: BusinessInsightRecord): Omit<HypothesisRecord, "id" | "createdAt" | "updatedAt"> {
  let statement = "The observed issue has an identifiable cause.";
  let expectedOutcome = "Metric improvement after targeted action.";

  if (insight.title.toLowerCase().includes("no orders")) {
    statement = "Low order volume in the last 24 hours is driven by a lack of recent high-intent conversations or follower growth.";
    expectedOutcome = "A welcome coupon or follower re-engagement campaign will increase orders within 48 hours.";
  } else if (insight.title.toLowerCase().includes("high-intent")) {
    statement = "This unanswered high-intent conversation represents a near-term conversion opportunity.";
    expectedOutcome = "Human takeover will increase conversion probability.";
  } else if (insight.title.toLowerCase().includes("no new followers")) {
    statement = "Follower growth stalled because existing followers were not re-engaged.";
    expectedOutcome = "A DM re-engagement campaign will restart follower growth.";
  } else if (insight.title.toLowerCase().includes("stale")) {
    statement = "Stale metric snapshots reduce confidence in recommendations.";
    expectedOutcome = "Refreshing integrations will restore data freshness and improve decision quality.";
  }

  return {
    userId: insight.userId,
    projectId: insight.projectId,
    insightId: insight.id,
    statement,
    features: insight.evidence,
    expectedOutcome,
    status: "PROPOSED",
    validatedAt: null,
    confidence: 0.5,
  };
}

export function makeHypothesisService(input: HypothesisServiceInput) {
  return {
    async generateFromOpenInsights(userId: string, projectId?: string): Promise<HypothesisRecord[]> {
      const insights = await input.insights.listOpen(userId, projectId, 50);
      const existing = await input.hypotheses.list(userId, projectId, 200);
      const seenInsightIds = new Set(existing.map((h) => h.insightId).filter(Boolean));

      const generated: HypothesisRecord[] = [];
      for (const insight of insights) {
        if (seenInsightIds.has(insight.id)) continue;
        const draft = hypothesisFromInsight(insight);
        const saved = await input.hypotheses.save(draft);
        generated.push(saved);
        await eventBus.publish(new HypothesisProposed(saved.id, { hypothesis: saved }));
      }
      return generated;
    },

    async list(userId: string, projectId?: string, limit = 20): Promise<HypothesisRecord[]> {
      return input.hypotheses.list(userId, projectId, limit);
    },
  };
}

export type HypothesisService = ReturnType<typeof makeHypothesisService>;

import { eventBus } from "@/shared/events";
import type { BusinessLearningRepository } from "./ports";
import { BusinessLearningUpdated } from "../domain/events";
import type { BusinessLearningRecord, OutcomeRecord, RecommendationRecord } from "../domain/types";

export interface BusinessLearningServiceInput {
  learning: BusinessLearningRepository;
}

function ruleNameFor(recommendation: RecommendationRecord): string {
  return `${recommendation.actionType}:${recommendation.reasonCodes.join(",")}`;
}

export function makeBusinessLearningService(input: BusinessLearningServiceInput) {
  return {
    async learnFromOutcome(
      recommendation: RecommendationRecord,
      outcome: OutcomeRecord,
    ): Promise<BusinessLearningRecord> {
      const ruleName = ruleNameFor(recommendation);
      const projectId = recommendation.projectId;
      let record = await input.learning.findByRule(recommendation.userId, ruleName, projectId ?? undefined);
      const success = outcome.status === "SUCCESS";
      const weightDelta = success ? 0.1 : -0.05;
      const now = new Date();

      if (!record) {
        record = await input.learning.save({
          userId: recommendation.userId,
          projectId,
          ruleName,
          condition: { actionType: recommendation.actionType, reasonCodes: recommendation.reasonCodes },
          effect: { targetMetric: recommendation.actionParams },
          weight: success ? 0.1 : -0.05,
          successCount: success ? 1 : 0,
          failureCount: success ? 0 : 1,
          lastOutcomeAt: now,
        });
      } else {
        record = await input.learning.updateOutcome(record.id, record.userId, success, weightDelta, now);
      }

      await eventBus.publish(new BusinessLearningUpdated(record.id, { learning: record }));
      return record;
    },

    async getWeight(userId: string, recommendation: RecommendationRecord): Promise<number> {
      const projectId = recommendation.projectId ?? undefined;
      const record = await input.learning.findByRule(userId, ruleNameFor(recommendation), projectId);
      return record?.weight ?? 0;
    },

    async list(userId: string, projectId?: string, limit = 20): Promise<BusinessLearningRecord[]> {
      return input.learning.list(userId, projectId, limit);
    },
  };
}

export type BusinessLearningService = ReturnType<typeof makeBusinessLearningService>;

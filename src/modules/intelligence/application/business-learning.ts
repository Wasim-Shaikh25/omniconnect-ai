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
      const storeId = recommendation.storeId;
      let record = await input.learning.findByRule(recommendation.organizationId, ruleName, storeId ?? undefined);
      const success = outcome.status === "SUCCESS";
      const weightDelta = success ? 0.1 : -0.05;
      const now = new Date();

      if (!record) {
        record = await input.learning.save({
          organizationId: recommendation.organizationId,
          storeId,
          ruleName,
          condition: { actionType: recommendation.actionType, reasonCodes: recommendation.reasonCodes },
          effect: { targetMetric: recommendation.actionParams },
          weight: success ? 0.1 : -0.05,
          successCount: success ? 1 : 0,
          failureCount: success ? 0 : 1,
          lastOutcomeAt: now,
        });
      } else {
        record = await input.learning.updateOutcome(record.id, success, weightDelta, now);
      }

      await eventBus.publish(new BusinessLearningUpdated(record.id, { learning: record }));
      return record;
    },

    async getWeight(organizationId: string, recommendation: RecommendationRecord): Promise<number> {
      const storeId = recommendation.storeId ?? undefined;
      const record = await input.learning.findByRule(organizationId, ruleNameFor(recommendation), storeId);
      return record?.weight ?? 0;
    },

    async list(organizationId: string, storeId?: string, limit = 20): Promise<BusinessLearningRecord[]> {
      return input.learning.list(organizationId, storeId, limit);
    },
  };
}

export type BusinessLearningService = ReturnType<typeof makeBusinessLearningService>;

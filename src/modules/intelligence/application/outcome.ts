import type { OutcomeRepository } from "./ports";
import type { OutcomeRecord, OutcomeStatus } from "../domain/types";

export interface OutcomeServiceInput {
  outcomes: OutcomeRepository;
}

export function makeOutcomeService(input: OutcomeServiceInput) {
  return {
    async create(
      userId: string,
      actionPlanId: string,
      projectId: string | null,
      metricName: string | null,
      beforeValue: number | null,
      confidence: number,
    ): Promise<OutcomeRecord> {
      return input.outcomes.save({
        userId,
        projectId,
        actionPlanId,
        metricName,
        beforeValue,
        afterValue: null,
        observationWindowDays: 1,
        measuredAt: null,
        status: "PENDING",
        attribution: "RULE_BASED",
        confidence,
      });
    },

    async measure(
      id: string,
      userId: string,
      beforeValue: number | null,
      afterValue: number | null,
      status: OutcomeStatus,
    ): Promise<OutcomeRecord> {
      return input.outcomes.updateMeasured(id, userId, beforeValue, afterValue, status, new Date());
    },

    async list(userId: string, projectId?: string, limit = 20): Promise<OutcomeRecord[]> {
      return input.outcomes.list(userId, projectId, limit);
    },
  };
}

export type OutcomeService = ReturnType<typeof makeOutcomeService>;

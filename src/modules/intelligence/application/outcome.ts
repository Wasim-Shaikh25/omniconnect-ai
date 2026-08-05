import type { OutcomeRepository } from "./ports";
import type { OutcomeRecord, OutcomeStatus } from "../domain/types";

export interface OutcomeServiceInput {
  outcomes: OutcomeRepository;
}

export function makeOutcomeService(input: OutcomeServiceInput) {
  return {
    async create(
      organizationId: string,
      actionPlanId: string,
      storeId: string | null,
      metricName: string | null,
      beforeValue: number | null,
      confidence: number,
    ): Promise<OutcomeRecord> {
      return input.outcomes.save({
        organizationId,
        storeId,
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
      organizationId: string,
      beforeValue: number | null,
      afterValue: number | null,
      status: OutcomeStatus,
    ): Promise<OutcomeRecord> {
      return input.outcomes.updateMeasured(id, organizationId, beforeValue, afterValue, status, new Date());
    },

    async list(organizationId: string, storeId?: string, limit = 20): Promise<OutcomeRecord[]> {
      return input.outcomes.list(organizationId, storeId, limit);
    },
  };
}

export type OutcomeService = ReturnType<typeof makeOutcomeService>;

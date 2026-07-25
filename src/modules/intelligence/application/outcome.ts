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
      beforeValue: number | null,
      afterValue: number | null,
      status: OutcomeStatus,
    ): Promise<OutcomeRecord> {
      return input.outcomes.updateMeasured(id, beforeValue, afterValue, status, new Date());
    },
  };
}

export type OutcomeService = ReturnType<typeof makeOutcomeService>;

import { eventBus } from "@/shared/events";
import type { ActionOutcomeRepository, DailyActionRepository } from "./ports";
import type { ActionOutcomeRecord } from "../domain/types";
import { classifyOutcome } from "../domain/daily-action";
import { ActionOutcomeMeasured } from "../domain/events";

export interface ActionOutcomeServiceInput {
  actionOutcomes: ActionOutcomeRepository;
  dailyActions: DailyActionRepository;
  metrics: { getMetric: (name: string, organizationId: string, storeId: string | null) => Promise<{ value: number | null } | null> };
  now?: () => Date;
}

function readMetricValue(json: unknown): number | null {
  if (json && typeof json === "object" && "value" in json) {
    const value = (json as { value: unknown }).value;
    return typeof value === "number" ? value : null;
  }
  return null;
}

export function makeActionOutcomeService(input: ActionOutcomeServiceInput) {
  const now = () => input.now?.() ?? new Date();

  async function measureById(outcomeId: string, organizationId: string): Promise<ActionOutcomeRecord | null> {
    const outcome = await input.actionOutcomes.findById(outcomeId, organizationId);
    if (!outcome) return null;
    return measureOutcome(outcome);
  }

  async function measure(actionId: string, organizationId: string): Promise<ActionOutcomeRecord | null> {
    const outcome = await input.actionOutcomes.findByAction(actionId, organizationId);
    if (!outcome) return null;
    return measureOutcome(outcome);
  }

  async function measureOutcome(outcome: ActionOutcomeRecord): Promise<ActionOutcomeRecord> {
    if (outcome.status !== "PENDING") return outcome;

    const before = readMetricValue(outcome.metricBefore);
    const after = outcome.metricName
      ? (await input.metrics.getMetric(outcome.metricName, outcome.organizationId, outcome.storeId))?.value ?? null
      : null;

    // Respect the observation window: if it has not elapsed and no movement is
    // measurable yet, leave PENDING for a later retry.
    const windowElapsed =
      now().getTime() - outcome.createdAt.getTime() >= outcome.observationWindowHours * 60 * 60 * 1000;

    let status = classifyOutcome(before, after);
    if (!windowElapsed && status === "NO_CHANGE") {
      // Keep pending until the window elapses so late effects are captured.
      return outcome;
    }
    if (windowElapsed && before !== null && after === null) {
      status = "NO_CHANGE";
    }

    const measured = await input.actionOutcomes.updateMeasured(
      outcome.id,
      outcome.organizationId,
      after !== null ? { value: after } : null,
      status,
      now(),
    );

    await eventBus.publish(
      new ActionOutcomeMeasured(outcome.actionId, {
        actionId: outcome.actionId,
        outcomeId: outcome.id,
        organizationId: outcome.organizationId,
        storeId: outcome.storeId,
        status,
      }),
    );

    return measured;
  }

  return { measure, measureById };
}

export type ActionOutcomeService = ReturnType<typeof makeActionOutcomeService>;

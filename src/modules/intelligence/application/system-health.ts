import { eventBus } from "@/shared/events";
import type { SystemMetricRepository } from "../application/ports";
import type { SystemMetricRecord } from "../domain/types";
import { SystemMetricRecorded } from "../domain/events";

export interface CostLatencyMonitorInput {
  metrics: SystemMetricRepository;
}

export function makeCostLatencyMonitor(input: CostLatencyMonitorInput) {
  return {
    async record(
      organizationId: string,
      operation: string,
      module: string,
      latencyMs: number,
      costCents = 0,
      status = "OK",
      traceId?: string,
      metadata?: unknown,
    ): Promise<SystemMetricRecord> {
      const saved = await input.metrics.save({
        organizationId,
        operation,
        module,
        latencyMs,
        costCents,
        status,
        traceId: traceId ?? null,
        metadata: metadata ?? null,
        recordedAt: new Date(),
      });
      await eventBus.publish(new SystemMetricRecorded(saved.id, { metric: saved }));
      return saved;
    },

    async summary(organizationId: string) {
      return input.metrics.summary(organizationId);
    },

    async list(organizationId: string, limit = 20): Promise<SystemMetricRecord[]> {
      return input.metrics.list(organizationId, undefined, limit);
    },
  };
}

export type CostLatencyMonitor = ReturnType<typeof makeCostLatencyMonitor>;

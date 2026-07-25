import { eventBus } from "@/shared/events";
import type { DataQualityRepository, MetricRepository } from "./ports";
import { DataQualityIssueDetected } from "../domain/events";
import type { DataQualityIssueRecord, DataQualitySeverity, DataQualityStatus } from "../domain/types";

export interface DataQualityCheckInput {
  organizationId: string;
  storeId?: string | null;
  source: string;
  entityType?: string | null;
  entityId?: string | null;
  metricName?: string | null;
  severity: DataQualitySeverity;
  impact?: string | null;
}

export function makeDataQualityService(
  issues: DataQualityRepository,
  metrics: MetricRepository,
) {
  return {
    async recordIssue(input: DataQualityCheckInput): Promise<DataQualityIssueRecord> {
      const existing = await issues.listOpen(input.organizationId);
      const same = existing.find(
        (i) =>
          i.source === input.source &&
          i.storeId === input.storeId &&
          i.metricName === input.metricName &&
          i.entityId === input.entityId,
      );
      if (same) return same;

      const issue = await issues.save({
        organizationId: input.organizationId,
        storeId: input.storeId ?? null,
        source: input.source,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metricName: input.metricName ?? null,
        severity: input.severity,
        impact: input.impact ?? null,
        status: "OPEN",
      });

      await eventBus.publish(new DataQualityIssueDetected(issue.id, { issue }));
      return issue;
    },

    async resolveIssue(id: string): Promise<DataQualityIssueRecord> {
      return issues.updateStatus(id, "RESOLVED");
    },

    async ignoreIssue(id: string): Promise<DataQualityIssueRecord> {
      return issues.updateStatus(id, "IGNORED");
    },

    async getOpenIssues(organizationId: string, storeId?: string): Promise<DataQualityIssueRecord[]> {
      return issues.listOpen(organizationId, storeId);
    },

    async inspectMetric(metricName: string, organizationId: string, storeId?: string | null): Promise<DataQualityIssueRecord | null> {
      const definition = await metrics.findDefinition(organizationId, metricName);
      if (!definition) return null;
      const latest = await metrics.getLatestSnapshot(definition.id, organizationId, storeId ?? null);
      if (!latest || latest.status === "MISSING" || latest.status === "STALE") {
        const severity: DataQualitySeverity = latest?.status === "MISSING" ? "HIGH" : "MEDIUM";
        return this.recordIssue({
          organizationId,
          storeId,
          source: definition.source,
          metricName: definition.name,
          severity,
          impact: latest?.status === "MISSING" ? "Metric data is missing" : "Metric is stale",
        });
      }
      return null;
    },
  };
}

export type DataQualityService = ReturnType<typeof makeDataQualityService>;

export type { DataQualitySeverity, DataQualityStatus };

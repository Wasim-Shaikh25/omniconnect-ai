import { eventBus } from "@/shared/events";
import type { DataQualityRepository, MetricRepository } from "./ports";
import { DataQualityIssueDetected } from "../domain/events";
import type { DataQualityIssueRecord, DataQualitySeverity, DataQualityStatus } from "../domain/types";

export interface DataQualityCheckInput {
  userId: string;
  projectId?: string | null;
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
      const existing = await issues.listOpen(input.userId);
      const same = existing.find(
        (i) =>
          i.source === input.source &&
          i.projectId === input.projectId &&
          i.metricName === input.metricName &&
          i.entityId === input.entityId,
      );
      if (same) return same;

      const issue = await issues.save({
        userId: input.userId,
        projectId: input.projectId ?? null,
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

    async resolveIssue(id: string, userId: string): Promise<DataQualityIssueRecord> {
      return issues.updateStatus(id, userId, "RESOLVED");
    },

    async ignoreIssue(id: string, userId: string): Promise<DataQualityIssueRecord> {
      return issues.updateStatus(id, userId, "IGNORED");
    },

    async getOpenIssues(userId: string, projectId?: string): Promise<DataQualityIssueRecord[]> {
      return issues.listOpen(userId, projectId);
    },

    async inspectMetric(metricName: string, userId: string, projectId?: string | null): Promise<DataQualityIssueRecord | null> {
      const definition = await metrics.findDefinition(userId, metricName);
      if (!definition) return null;
      const latest = await metrics.getLatestSnapshot(definition.id, userId, projectId ?? null);
      if (!latest || latest.status === "MISSING" || latest.status === "STALE") {
        const severity: DataQualitySeverity = latest?.status === "MISSING" ? "HIGH" : "MEDIUM";
        return this.recordIssue({
          userId,
          projectId,
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

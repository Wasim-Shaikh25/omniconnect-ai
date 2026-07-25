import type { BusinessInsightRepository } from "./ports";
import type { BusinessInsightRecord } from "../domain/types";

export interface IntelligenceFeedInput {
  insights: BusinessInsightRepository;
}

function severityRank(severity: BusinessInsightRecord["severity"]): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

export function makeIntelligenceFeed(input: IntelligenceFeedInput) {
  return {
    async getFeed(
      organizationId: string,
      storeId?: string,
      limit = 20,
    ): Promise<BusinessInsightRecord[]> {
      const insights = await input.insights.listOpen(organizationId, storeId, limit);
      return insights.sort((a, b) => {
        const sevDiff = severityRank(b.severity) - severityRank(a.severity);
        if (sevDiff !== 0) return sevDiff;
        return b.generatedAt.getTime() - a.generatedAt.getTime();
      });
    },

    async dismiss(id: string): Promise<BusinessInsightRecord | null> {
      return input.insights.updateStatus(id, "DISMISSED");
    },
  };
}

export type IntelligenceFeedService = ReturnType<typeof makeIntelligenceFeed>;

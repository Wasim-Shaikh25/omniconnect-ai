import type { DetectionService } from "./detection";
import type { RecommendationService } from "./recommendation";
import type { RecommendationLifecycleService } from "./recommendation-lifecycle";
import type { MetricService } from "./metrics";

export interface ReadModelRefresherInput {
  detection: DetectionService;
  recommendations: RecommendationService;
  lifecycle: RecommendationLifecycleService;
  metrics: MetricService;
}

export interface ReadModelRefreshResult {
  insightsGenerated: number;
  recommendationsGenerated: number;
  ranked: number;
  expired: string[];
  metricsRefreshed: number;
}

export function makeReadModelRefresher(input: ReadModelRefresherInput) {
  return {
    async refreshStore(organizationId: string, storeId: string): Promise<ReadModelRefreshResult> {
      await input.detection.analyzeStore(organizationId, storeId);
      const generated = await input.recommendations.generateFromOpenInsights(organizationId, storeId);
      const prioritized = await input.lifecycle.prioritizeRecommendations(organizationId, storeId, 50);
      const { expired } = await input.lifecycle.expireStaleRecommendations(organizationId);
      const metrics = await input.metrics.getMetricsForWorkspace(organizationId);

      return {
        insightsGenerated: 0,
        recommendationsGenerated: generated.length,
        ranked: prioritized.length,
        expired,
        metricsRefreshed: metrics.length,
      };
    },
  };
}

export type ReadModelRefresher = ReturnType<typeof makeReadModelRefresher>;

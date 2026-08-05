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
    async refreshStore(userId: string, projectId: string): Promise<ReadModelRefreshResult> {
      await input.detection.analyzeStore(userId, projectId);
      const generated = await input.recommendations.generateFromOpenInsights(userId, projectId);
      const prioritized = await input.lifecycle.prioritizeRecommendations(userId, projectId, 50);
      const { expired } = await input.lifecycle.expireStaleRecommendations(userId);
      const metrics = await input.metrics.getMetricsForWorkspace(userId);

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

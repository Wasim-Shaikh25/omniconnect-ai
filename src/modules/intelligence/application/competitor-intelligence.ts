import { eventBus } from "@/shared/events";
import type { CompetitorInsightRepository } from "../application/ports";
import type { CompetitorInsightRecord } from "../domain/types";
import { CompetitorInsightGenerated } from "../domain/events";
import type { TrackedAccountRecord } from "@/modules/analytics";

export interface CompetitorIntelligenceServiceInput {
  insights: CompetitorInsightRepository;
  getStoreFollowerCount: (organizationId: string, storeId: string) => Promise<number>;
}

function competitorScore(analysis: unknown): number {
  if (typeof analysis !== "object" || analysis === null) return 0;
  const a = analysis as Record<string, unknown>;
  const arrays = ["strengths", "weaknesses", "contentPatterns", "recommendations", "hashtags"];
  return arrays.reduce((sum, key) => {
    const value = a[key];
    return sum + (Array.isArray(value) ? value.length : 0);
  }, 0);
}

function postVolume(media: unknown): number {
  return Array.isArray(media) ? media.length : 0;
}

export function makeCompetitorIntelligenceService(input: CompetitorIntelligenceServiceInput) {
  return {
    async generateForStore(
      organizationId: string,
      storeId: string,
      accounts: TrackedAccountRecord[],
    ): Promise<CompetitorInsightRecord[]> {
      const storeFollowerCount = await input.getStoreFollowerCount(organizationId, storeId);
      const generated: CompetitorInsightRecord[] = [];

      for (const account of accounts) {
        const pv = postVolume(account.lastMedia);
        const score = competitorScore(account.lastAnalysis);

        generated.push(
          await input.insights.save({
            organizationId,
            storeId,
            competitorHandle: account.handle,
            metricName: "post_volume",
            value: pv,
            benchmarkDelta: pv - storeFollowerCount,
            features: { storeFollowerCount, platform: account.platform },
            source: "analytics.trackedAccount",
            capturedAt: new Date(),
          }),
        );

        generated.push(
          await input.insights.save({
            organizationId,
            storeId,
            competitorHandle: account.handle,
            metricName: "content_diversity",
            value: score,
            benchmarkDelta: score - storeFollowerCount,
            features: { storeFollowerCount, platform: account.platform },
            source: "analytics.trackedAccount",
            capturedAt: new Date(),
          }),
        );
      }

      for (const insight of generated) {
        await eventBus.publish(new CompetitorInsightGenerated(insight.id, { insight }));
      }

      return generated;
    },

    async list(organizationId: string, storeId?: string, limit = 20): Promise<CompetitorInsightRecord[]> {
      return input.insights.list(organizationId, storeId, limit);
    },
  };
}

export type CompetitorIntelligenceService = ReturnType<typeof makeCompetitorIntelligenceService>;

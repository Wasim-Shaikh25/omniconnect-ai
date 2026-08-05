import { eventBus } from "@/shared/events";
import type {
  PredictionRepository,
  RecommendationRepository,
  PortfolioSnapshotRepository,
} from "../application/ports";
import type { PortfolioSnapshotRecord } from "../domain/types";
import { PortfolioSnapshotGenerated } from "../domain/events";

export interface PortfolioServiceInput {
  snapshots: PortfolioSnapshotRepository;
  predictions: PredictionRepository;
  recommendations: RecommendationRepository;
  getStores: (userId: string) => Promise<{ id: string; name: string }[]>;
}

export function makePortfolioService(input: PortfolioServiceInput) {
  return {
    async generateSnapshot(userId: string): Promise<PortfolioSnapshotRecord> {
      const stores = await input.getStores(userId);
      let totalRevenueEstimate = 0;
      let totalChurnRisk = 0;
      let topRiskStoreId: string | null = null;
      let topRiskScore = -Infinity;
      const recommendationTypeCounts: Record<string, number> = {};

      for (const store of stores) {
        const [revenuePrediction, churnPrediction, openRecommendations] = await Promise.all([
          input.predictions
            .listActive(userId, store.id, 20)
            .then((p) => p.find((x) => x.predictionType === "REVENUE_FORECAST")),
          input.predictions
            .listActive(userId, store.id, 20)
            .then((p) => p.find((x) => x.predictionType === "CHURN")),
          input.recommendations.listOpen(userId, store.id, 50),
        ]);

        if (typeof revenuePrediction?.estimate === "number") {
          totalRevenueEstimate += revenuePrediction.estimate;
        }
        const churnEstimate = typeof churnPrediction?.estimate === "number" ? churnPrediction.estimate : 0;
        totalChurnRisk += churnEstimate;
        if (churnEstimate > topRiskScore) {
          topRiskScore = churnEstimate;
          topRiskStoreId = store.id;
        }

        for (const rec of openRecommendations) {
          recommendationTypeCounts[rec.actionType] = (recommendationTypeCounts[rec.actionType] ?? 0) + 1;
        }
      }

      const topRecommendationType = Object.entries(recommendationTypeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const draft: Omit<PortfolioSnapshotRecord, "id" | "createdAt" | "updatedAt"> = {
        userId,
        storeCount: stores.length,
        totalRevenueEstimate: totalRevenueEstimate || null,
        totalChurnRisk: totalChurnRisk || null,
        topRecommendationType,
        topRiskStoreId,
        features: { stores: stores.map((s) => s.id) },
        generatedAt: new Date(),
      };

      const saved = await input.snapshots.save(draft);
      await eventBus.publish(new PortfolioSnapshotGenerated(saved.id, { snapshot: saved }));
      return saved;
    },

    async getLatest(userId: string): Promise<PortfolioSnapshotRecord | null> {
      return input.snapshots.findLatest(userId);
    },
  };
}

export type PortfolioService = ReturnType<typeof makePortfolioService>;

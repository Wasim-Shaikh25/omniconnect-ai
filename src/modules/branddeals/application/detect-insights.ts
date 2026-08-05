import { eventBus } from "@/shared/events";
import type { BrandDealQueries } from "./ports";
import {
  BrandDealInsight,
  BrandDealRecommendation,
  BrandDealInsightGenerated,
  BrandDealRecommendationGenerated,
} from "../domain/events";

export type { BrandDealInsight, BrandDealRecommendation } from "../domain/events";

export interface DetectBrandDealInsightsInput {
  brandDeals: BrandDealQueries;
  now?: Date;
}

export interface DetectBrandDealInsights {
  (userId: string, projectId: string): Promise<{
    insights: BrandDealInsight[];
    recommendations: BrandDealRecommendation[];
  }>;
}

export function makeDetectBrandDealInsights(input: DetectBrandDealInsightsInput): DetectBrandDealInsights {
  const now = input.now ?? new Date();

  return async function detectBrandDealInsights(userId: string, projectId: string) {
    const insights: BrandDealInsight[] = [];
    const recommendations: BrandDealRecommendation[] = [];

    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const deals = await input.brandDeals.listByStore(projectId, 50);

    for (const deal of deals) {
      if (deal.status === "NEGOTIATING" && deal.updatedAt <= fourteenDaysAgo) {
        const insight: BrandDealInsight = {
          userId,
          projectId,
          dealId: deal.id,
          type: "RISK",
          severity: "MEDIUM",
          status: "OPEN",
          title: `Brand deal ${deal.brandName} stuck in negotiation`,
          description: `Deal with ${deal.brandName} has been in NEGOTIATING status for more than 14 days without an update.`,
          deepLink: `/stores/${projectId}/brand-deals`,
          generatedAt: now,
        };
        insights.push(insight);
        recommendations.push({
          userId,
          projectId,
          dealId: deal.id,
          type: "ACTION",
          priority: "MEDIUM",
          title: `Follow up on ${deal.brandName} deal`,
          description: `Deal with ${deal.brandName} has been negotiating for over 14 days. Consider following up or revising terms.`,
          deepLink: `/stores/${projectId}/brand-deals`,
          generatedAt: now,
        });
      }
    }

    for (const insight of insights) {
      await eventBus.publish(
        new BrandDealInsightGenerated(insight.dealId, { userId, projectId, dealId: insight.dealId, insight }),
      );
    }
    for (const recommendation of recommendations) {
      await eventBus.publish(
        new BrandDealRecommendationGenerated(recommendation.dealId, {
          userId,
          projectId,
          dealId: recommendation.dealId,
          recommendation,
        }),
      );
    }

    return { insights, recommendations };
  };
}

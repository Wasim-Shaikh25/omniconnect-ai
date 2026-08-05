import { eventBus } from "@/shared/events";
import type { GrowthQueries } from "./ports";
import {
  GrowthInsight,
  GrowthRecommendation,
  GrowthInsightGenerated,
  GrowthRecommendationGenerated,
} from "../domain/events";

export type { GrowthInsight, GrowthRecommendation } from "../domain/events";

export interface DetectGrowthInsightsInput {
  growth: GrowthQueries;
  now?: Date;
}

export interface DetectGrowthInsights {
  (organizationId: string, storeId: string): Promise<{
    insights: GrowthInsight[];
    recommendations: GrowthRecommendation[];
  }>;
}

export function makeDetectGrowthInsights(input: DetectGrowthInsightsInput): DetectGrowthInsights {
  const now = input.now ?? new Date();

  return async function detectGrowthInsights(organizationId: string, storeId: string) {
    const insights: GrowthInsight[] = [];
    const recommendations: GrowthRecommendation[] = [];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const campaigns = await input.growth.listCampaigns(storeId, 50);
    const staleCampaigns = campaigns.filter((c) => c.status !== "SENT" && (c.updatedAt ?? c.createdAt) <= sevenDaysAgo);

    if (staleCampaigns.length > 0) {
      const campaign = staleCampaigns[0];
      const insight: GrowthInsight = {
        organizationId,
        storeId,
        type: "RISK",
        severity: "MEDIUM",
        status: "OPEN",
        title: `DM campaign ${campaign.id.slice(0, 8)} is stale`,
        description: `${staleCampaigns.length} DM campaign(s) have not been sent in the last 7 days.`,
        deepLink: `/stores/${storeId}/growth`,
        generatedAt: now,
      };
      insights.push(insight);
      recommendations.push({
        organizationId,
        storeId,
        type: "ACTION",
        priority: "MEDIUM",
        title: "Review and send stale DM campaigns",
        description: `${staleCampaigns.length} DM campaign(s) are pending or scheduled but have not been sent.`,
        deepLink: `/stores/${storeId}/growth`,
        generatedAt: now,
      });
    }

    const ugc = await input.growth.listUgc(storeId, 50);
    if (ugc.length === 0) {
      const opportunity: GrowthInsight = {
        organizationId,
        storeId,
        type: "OPPORTUNITY",
        severity: "LOW",
        status: "OPEN",
        title: "No UGC collected yet",
        description: "Collect user-generated content to fuel social proof and ad creative.",
        deepLink: `/stores/${storeId}/growth`,
        generatedAt: now,
      };
      insights.push(opportunity);
      recommendations.push({
        organizationId,
        storeId,
        type: "ACTION",
        priority: "LOW",
        title: "Start collecting UGC",
        description: "There is no user-generated content for this store yet.",
        deepLink: `/stores/${storeId}/growth`,
        generatedAt: now,
      });
    }

    for (const insight of insights) {
      await eventBus.publish(new GrowthInsightGenerated(storeId, { organizationId, storeId, insight }));
    }
    for (const recommendation of recommendations) {
      await eventBus.publish(new GrowthRecommendationGenerated(storeId, { organizationId, storeId, recommendation }));
    }

    return { insights, recommendations };
  };
}

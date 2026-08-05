import { eventBus } from "@/shared/events";
import type { CrmQueries } from "./queries";
import {
  CrmInsight,
  CrmRecommendation,
  CrmInsightGenerated,
  CrmRecommendationGenerated,
} from "../domain/events";

export type { CrmInsight, CrmRecommendation } from "../domain/events";

export interface DetectCrmInsightsInput {
  crm: CrmQueries;
  now?: Date;
}

export interface DetectCrmInsights {
  (userId: string, projectId: string): Promise<{
    insights: CrmInsight[];
    recommendations: CrmRecommendation[];
  }>;
}

export function makeDetectCrmInsights(input: DetectCrmInsightsInput): DetectCrmInsights {
  const now = input.now ?? new Date();

  return async function detectCrmInsights(userId: string, projectId: string) {
    const insights: CrmInsight[] = [];
    const recommendations: CrmRecommendation[] = [];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const followers = await input.crm.listFollowers(projectId, 100);
    const recentFollowers = followers.filter((f) => f.followedAt >= sevenDaysAgo);

    if (followers.length > 0 && recentFollowers.length === 0) {
      const insight: CrmInsight = {
        userId,
        projectId,
        type: "RISK",
        severity: "MEDIUM",
        status: "OPEN",
        title: "No new followers this week",
        description: "Follower growth has stalled. Consider a first-time follower campaign or content push.",
        deepLink: `/stores/${projectId}/campaigns/first-follower`,
        generatedAt: now,
      };
      insights.push(insight);
      recommendations.push({
        userId,
        projectId,
        type: "ACTION",
        priority: "MEDIUM",
        title: "Launch first-time follower campaign",
        description: `No new followers in the last 7 days for a store with ${followers.length} existing followers.`,
        deepLink: `/stores/${projectId}/campaigns/first-follower`,
        generatedAt: now,
      });
    }

    for (const insight of insights) {
      await eventBus.publish(new CrmInsightGenerated(projectId, { userId, projectId, insight }));
    }
    for (const recommendation of recommendations) {
      await eventBus.publish(new CrmRecommendationGenerated(projectId, { userId, projectId, recommendation }));
    }

    return { insights, recommendations };
  };
}

import { eventBus } from "@/shared/events";
import type { ConversationQueries } from "./queries";
import {
  ConversationInsight,
  ConversationRecommendation,
  ConversationInsightGenerated,
  ConversationRecommendationGenerated,
} from "../domain/events";

export type { ConversationInsight, ConversationRecommendation } from "../domain/events";

export interface DetectConversationInsightsInput {
  conversations: ConversationQueries;
  now?: Date;
}

export interface DetectConversationInsights {
  (organizationId: string, storeId: string): Promise<{
    insights: ConversationInsight[];
    recommendations: ConversationRecommendation[];
  }>;
}

export function makeDetectConversationInsights(input: DetectConversationInsightsInput): DetectConversationInsights {
  const now = input.now ?? new Date();

  return async function detectConversationInsights(organizationId: string, storeId: string) {
    const insights: ConversationInsight[] = [];
    const recommendations: ConversationRecommendation[] = [];

    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const conversations = await input.conversations.listConversations(storeId, 100);
    const seen = new Set<string>();

    for (const conversation of conversations) {
      if (conversation.status === "HUMAN_ACTIVE") continue;

      const detail = await input.conversations.getConversation(conversation.id);
      if (!detail) continue;

      const recentCustomerMessage = detail.messages.find(
        (m) => m.sender === "CUSTOMER" && m.createdAt >= thirtyMinutesAgo,
      );
      if (!recentCustomerMessage) continue;
      if (seen.has(conversation.id)) continue;
      seen.add(conversation.id);

      const shortId = conversation.id.slice(0, 8);
      const insight: ConversationInsight = {
        organizationId,
        storeId,
        conversationId: conversation.id,
        type: "OPPORTUNITY",
        severity: "MEDIUM",
        status: "OPEN",
        title: `High-intent conversation ${shortId} needs attention`,
        description: `A ${conversation.channel} conversation has an unanswered customer message. Review to avoid losing a hot lead.`,
        deepLink: `/stores/${storeId}/conversations/${conversation.id}`,
        generatedAt: now,
      };
      insights.push(insight);
      recommendations.push({
        organizationId,
        storeId,
        conversationId: conversation.id,
        type: "ACTION",
        priority: "HIGH",
        title: "Reply to high-intent conversation",
        description: `Conversation ${shortId} has an unanswered customer message.`,
        deepLink: `/stores/${storeId}/conversations/${conversation.id}`,
        generatedAt: now,
      });
    }

    for (const insight of insights) {
      await eventBus.publish(
        new ConversationInsightGenerated(insight.conversationId, {
          organizationId,
          storeId,
          conversationId: insight.conversationId,
          insight,
        }),
      );
    }
    for (const recommendation of recommendations) {
      await eventBus.publish(
        new ConversationRecommendationGenerated(recommendation.conversationId, {
          organizationId,
          storeId,
          conversationId: recommendation.conversationId,
          recommendation,
        }),
      );
    }

    return { insights, recommendations };
  };
}

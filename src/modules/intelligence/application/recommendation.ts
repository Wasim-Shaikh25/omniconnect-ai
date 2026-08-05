import { eventBus } from "@/shared/events";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { BusinessInsightRepository, RecommendationRepository } from "./ports";
import type { BusinessInsightRecord, BusinessObjective, RecommendationRecord, RiskTier } from "../domain/types";
import {
  inferBusinessObjective,
  diagnoseRecommendationContext,
  recalculateConfidence,
} from "../domain/objective";
import { ConfidenceChanged } from "../domain/events";

export interface RecommendationServiceInput {
  insights: BusinessInsightRepository;
  recommendations: RecommendationRepository;
  ecommerce: EcommerceQueries;
}

function riskFromSeverity(severity: BusinessInsightRecord["severity"]): RiskTier {
  switch (severity) {
    case "CRITICAL":
      return "TIER_4";
    case "HIGH":
      return "TIER_3";
    case "MEDIUM":
      return "TIER_2";
    default:
      return "TIER_1";
  }
}

function isRisk(category: string): boolean {
  return category === "PRICE_OBJECTION" || category === "COMPLAINT";
}

async function recommendationFromInsight(
  insight: BusinessInsightRecord,
  ecommerce: EcommerceQueries,
): Promise<Omit<RecommendationRecord, "id" | "createdAt" | "updatedAt"> | null> {
  const now = new Date();
  const base = {
    userId: insight.userId,
    projectId: insight.projectId,
    insightId: insight.id,
    producedByModule: "intelligence" as const,
    producedByService: "recommendationFromInsight",
    businessObjective: null as BusinessObjective | null,
    reasoning: null as string | null,
    marketContext: null as string | null,
    competitorContext: null as string | null,
    selfContext: null as string | null,
    confidenceSignals: 1,
    status: "PROPOSED" as RecommendationRecord["status"],
    generatedAt: now,
    validFrom: now,
    validUntil: null,
    invalidatedAt: null,
    invalidatedByEvent: null,
    dismissedAt: null,
    snoozedUntil: null,
  };

  if (insight.title.toLowerCase().includes("no orders")) {
    return {
      ...base,
      title: "Offer a welcome coupon to recover revenue",
      description: "No orders were completed in the last 24 hours. A targeted coupon can nudge high-intent visitors to complete checkout.",
      objective: "Increase orders",
      reasonCodes: ["revenue_decline", "low_conversion"],
      impactRange: { min: 1, max: 5, unit: "orders" },
      confidence: 0.6,
      effort: "LOW",
      urgency: "HIGH",
      riskTier: riskFromSeverity(insight.severity),
      eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
      actionType: "GENERATE_COUPON",
      actionParams: { projectId: insight.projectId, discountPct: 10 },
      deepLink: insight.projectId ? `/stores/${insight.projectId}/coupons` : "/dashboard",
    };
  }

  if (insight.title.toLowerCase().includes("high-intent")) {
    const conversationId = insight.evidence?.signalIds[0] ?? "";
    return {
      ...base,
      title: "Take over the high-intent conversation",
      description: insight.description,
      objective: "Convert hot lead",
      reasonCodes: ["hot_lead", "unanswered_message"],
      impactRange: { min: 1, max: 1, unit: "conversion" },
      confidence: 0.7,
      effort: "LOW",
      urgency: "HIGH",
      riskTier: riskFromSeverity(insight.severity),
      eligibility: { requiresApproval: false, roles: ["SUPER_ADMIN", "USER", "USER"] },
      actionType: "TAKE_OVER_CONVERSATION",
      actionParams: { projectId: insight.projectId, conversationId },
      deepLink: insight.deepLink ?? "/inbox",
    };
  }

  if (insight.title.toLowerCase().includes("no new followers")) {
    return {
      ...base,
      title: "Launch a follower re-engagement DM campaign",
      description: "No new followers in the last 7 days. Re-activate your existing audience with a targeted DM campaign.",
      objective: "Grow followers",
      reasonCodes: ["follower_growth_stall", "audience_reactivation"],
      impactRange: { min: 5, max: 50, unit: "followers" },
      confidence: 0.5,
      effort: "MEDIUM",
      urgency: "MEDIUM",
      riskTier: riskFromSeverity(insight.severity),
      eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: { projectId: insight.projectId, campaignType: "RE_ENGAGE", audienceCriteria: { segment: "existing_followers" } },
      deepLink: insight.projectId ? `/stores/${insight.projectId}/commerce/growth` : "/dashboard",
    };
  }

  if (
    (insight.title.toLowerCase().includes("out of stock") ||
      insight.title.toLowerCase().includes("low stock")) &&
    insight.projectId
  ) {
    const titleMatch = insight.title.match(/^"([^"]+)"/);
    const productTitle = titleMatch?.[1] ?? "";
    if (productTitle) {
      const products = await ecommerce.listProducts(insight.projectId, 100);
      const outOfStockProduct = products.find((p) => p.title.toLowerCase() === productTitle.toLowerCase());
      const alternative = products
        .filter((p) => p.externalId !== outOfStockProduct?.externalId && typeof p.inventory === "number" && p.inventory > 0)
        .sort((a, b) => (b.inventory ?? 0) - (a.inventory ?? 0))[0];

      if (alternative) {
        return {
          ...base,
          title: `Offer "${alternative.title}" to customers asking about "${productTitle}"`,
          description: insight.description,
          objective: "Recover lost demand",
          reasonCodes: ["out_of_stock", "demand_mismatch", "alternative_product"],
          impactRange: { min: 1, max: 10, unit: "conversions" },
          confidence: 0.6,
          effort: "LOW",
          urgency: insight.severity === "HIGH" ? "HIGH" : "MEDIUM",
          riskTier: riskFromSeverity(insight.severity),
          eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
          actionType: "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN",
          actionParams: {
            projectId: insight.projectId,
            outOfStockProductTitle: productTitle,
            alternativeProductTitle: alternative.title,
            audienceCriteria: { conversationMentions: productTitle },
          },
          deepLink: `/stores/${insight.projectId}/commerce/growth`,
        };
      }
    }
  }

  if (insight.title.toLowerCase().includes("dm pattern:")) {
    const categoryMatch = insight.title.match(/DM pattern: ([\w_]+)/i);
    const category = categoryMatch?.[1] ?? "question";
    const sample = insight.evidence?.summary?.match(/Sample: "([^"]+)"/)?.[1] ?? "";
    return {
      ...base,
      title: `Send a DM campaign addressing "${category.replace(/_/g, " ")}"`,
      description: insight.description,
      objective: "Convert recurring DM questions into engagement",
      reasonCodes: ["dm_pattern", "recurring_question"],
      impactRange: { min: 1, max: 20, unit: "responses" },
      confidence: 0.6,
      effort: "LOW",
      urgency: "MEDIUM",
      riskTier: riskFromSeverity(insight.severity),
      eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: {
        projectId: insight.projectId,
        campaignType: "ANSWER_PATTERN",
        audienceCriteria: { segment: "recent_conversations", dmPattern: category, sampleQuestion: sample },
      },
      deepLink: insight.projectId ? `/stores/${insight.projectId}/commerce/growth` : "/dashboard",
    };
  }

  if (insight.title.toLowerCase().includes("comment pattern:")) {
    const categoryMatch = insight.title.match(/Comment pattern: ([\w_]+)/i);
    const category = categoryMatch?.[1] ?? "feedback";
    const isObjection = isRisk(category);
    return {
      ...base,
      title: isObjection
        ? `Create a response campaign for "${category.replace(/_/g, " ")}" comments`
        : `Run a campaign amplifying "${category.replace(/_/g, " ")}" feedback`,
      description: insight.description,
      objective: isObjection ? "Address objections and prevent churn" : "Turn positive feedback into reach",
      reasonCodes: ["comment_pattern", isObjection ? "objection" : "social_proof"],
      impactRange: { min: 1, max: 15, unit: "engagements" },
      confidence: 0.55,
      effort: "LOW",
      urgency: isObjection ? "HIGH" : "MEDIUM",
      riskTier: riskFromSeverity(insight.severity),
      eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: {
        projectId: insight.projectId,
        campaignType: isObjection ? "OBJECTION_RESPONSE" : "SOCIAL_PROOF",
        audienceCriteria: { segment: "recent_commenters", commentPattern: category },
      },
      deepLink: insight.projectId ? `/stores/${insight.projectId}/commerce/growth` : "/dashboard",
    };
  }

  if (insight.title.toLowerCase().includes("revenue declined")) {
    const title = insight.title.toLowerCase();
    const availabilityDriven = title.includes("out-of-stock") || title.includes("low-stock") || title.includes("availability");
    const aovDriven = title.includes("lower aov") || title.includes("higher aov");

    if (aovDriven) {
      return {
        ...base,
        title: "Generate a threshold coupon to lift AOV",
        description: "Revenue decline is driven by lower average order value. A minimum-spend discount can nudge customers to add more to their cart.",
        objective: "Increase AOV",
        reasonCodes: ["aov_decline", "revenue_decline"],
        impactRange: { min: 5, max: 20, unit: "AOV_pct" },
        confidence: 0.6,
        effort: "LOW",
        urgency: insight.severity === "HIGH" || insight.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
        riskTier: riskFromSeverity(insight.severity),
        eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
        actionType: "GENERATE_COUPON",
        actionParams: { projectId: insight.projectId, discountPct: 10, minimumSpendPct: 25 },
        deepLink: insight.projectId ? `/stores/${insight.projectId}/coupons` : "/dashboard",
      };
    }

    if (availabilityDriven && insight.projectId) {
      const products = await ecommerce.listProducts(insight.projectId, 100);
      const alternative = products
        .filter((p) => typeof p.inventory === "number" && p.inventory > 0)
        .sort((a, b) => (b.inventory ?? 0) - (a.inventory ?? 0))[0];

      if (alternative) {
        return {
          ...base,
          title: `Promote "${alternative.title}" to recover revenue lost to stock issues`,
          description: insight.description,
          objective: "Recover revenue",
          reasonCodes: ["revenue_decline", "availability", "alternative_product"],
          impactRange: { min: 1, max: 10, unit: "conversions" },
          confidence: 0.55,
          effort: "LOW",
          urgency: insight.severity === "HIGH" || insight.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
          riskTier: riskFromSeverity(insight.severity),
          eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
          actionType: "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN",
          actionParams: { projectId: insight.projectId, outOfStockProductTitle: "N/A", alternativeProductTitle: alternative.title, audienceCriteria: { segment: "recent_customers" } },
          deepLink: `/stores/${insight.projectId}/commerce/growth`,
        };
      }
    }

    return {
      ...base,
      title: "Launch a re-engagement DM campaign to recover lost orders",
      description: "Revenue decline is driven by fewer orders. Re-engage recent customers and high-intent conversations with a targeted DM campaign.",
      objective: "Recover orders",
      reasonCodes: ["revenue_decline", "order_volume_decline"],
      impactRange: { min: 5, max: 50, unit: "orders" },
      confidence: 0.5,
      effort: "MEDIUM",
      urgency: insight.severity === "HIGH" || insight.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
      riskTier: riskFromSeverity(insight.severity),
      eligibility: { requiresApproval: true, roles: ["SUPER_ADMIN", "USER"] },
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: { projectId: insight.projectId, campaignType: "RE_ENGAGE", audienceCriteria: { segment: "recent_customers" } },
      deepLink: insight.projectId ? `/stores/${insight.projectId}/commerce/growth` : "/dashboard",
    };
  }

  return {
    ...base,
    title: "Refresh integrations and recompute metrics",
    description: insight.description,
    objective: "Improve data freshness",
    reasonCodes: ["stale_data", "integration_health"],
    impactRange: { min: 0, max: 0, unit: "issues" },
    confidence: 0.9,
    effort: "LOW",
    urgency: "LOW",
    riskTier: "TIER_1",
    eligibility: { requiresApproval: false, roles: ["SUPER_ADMIN", "USER", "USER"] },
    actionType: "REFRESH_INTEGRATION",
    actionParams: { projectId: insight.projectId, metricNames: insight.evidence?.metricIds ?? [] },
    deepLink: insight.projectId ? `/stores/${insight.projectId}/integrations` : "/dashboard",
  };
}

export function makeRecommendationService(input: RecommendationServiceInput) {
  return {
    async generateFromOpenInsights(userId: string, projectId?: string): Promise<RecommendationRecord[]> {
      const insights = await input.insights.listOpen(userId, projectId, 50);
      const existing = await input.recommendations.listOpen(userId, projectId, 200);
      const seenInsightIds = new Set(existing.map((r) => r.insightId).filter(Boolean));

      const generated: RecommendationRecord[] = [];
      for (const insight of insights) {
        if (seenInsightIds.has(insight.id)) continue;
        const draft = await recommendationFromInsight(insight, input.ecommerce);
        if (!draft) continue;
        const objective = inferBusinessObjective(draft.reasonCodes, draft.objective);
        const diagnosis = diagnoseRecommendationContext({ reasonCodes: draft.reasonCodes });
        const saved = await input.recommendations.save({
          ...draft,
          businessObjective: objective,
          reasoning: diagnosis.reasoning,
          marketContext: diagnosis.marketContext,
          competitorContext: diagnosis.competitorContext,
          selfContext: diagnosis.selfContext,
        });
        generated.push(saved);
      }
      return generated;
    },

    async listOpen(userId: string, projectId?: string, limit = 20): Promise<RecommendationRecord[]> {
      return input.recommendations.listOpen(userId, projectId, limit);
    },

    async dismiss(id: string, userId: string): Promise<RecommendationRecord | null> {
      return input.recommendations.updateStatus(id, userId, "DISMISSED");
    },

    async tagObjective(
      recommendationId: string,
      userId: string,
      objective: BusinessObjective,
      reason: string,
    ): Promise<RecommendationRecord | null> {
      return input.recommendations.updateObjective(recommendationId, userId, objective, reason);
    },

    async recalculateConfidence(
      recommendationId: string,
      userId: string,
      signals?: { supportingSignals?: number; contradictingSignals?: number },
    ): Promise<RecommendationRecord | null> {
      const rec = await input.recommendations.findById(recommendationId, userId);
      if (!rec) return null;
      const next = recalculateConfidence({
        currentConfidence: rec.confidence ?? 0.5,
        currentSignals: rec.confidenceSignals ?? 0,
        supportingSignals: signals?.supportingSignals ?? 1,
        contradictingSignals: signals?.contradictingSignals ?? 0,
      });
      const updated = await input.recommendations.updateConfidence(recommendationId, userId, next.confidence, next.signals);
      if (updated && Math.abs((rec.confidence ?? 0.5) - next.confidence) >= 0.001) {
        await eventBus.publish(
          new ConfidenceChanged(recommendationId, {
            subjectType: "Recommendation",
            subjectId: recommendationId,
            previousConfidence: rec.confidence ?? null,
            newConfidence: next.confidence,
            signals: next.signals,
          }),
        );
      }
      return updated;
    },
  };
}

export type RecommendationService = ReturnType<typeof makeRecommendationService>;

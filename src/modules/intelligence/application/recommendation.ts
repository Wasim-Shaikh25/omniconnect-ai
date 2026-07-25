import type { EcommerceQueries } from "@/modules/ecommerce";
import type { BusinessInsightRepository, RecommendationRepository } from "./ports";
import type { BusinessInsightRecord, RecommendationRecord, RiskTier } from "../domain/types";

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

async function recommendationFromInsight(
  insight: BusinessInsightRecord,
  ecommerce: EcommerceQueries,
): Promise<Omit<RecommendationRecord, "id" | "createdAt" | "updatedAt"> | null> {
  const base = {
    organizationId: insight.organizationId,
    storeId: insight.storeId,
    insightId: insight.id,
    status: "PROPOSED" as RecommendationRecord["status"],
    generatedAt: new Date(),
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
      eligibility: { requiresApproval: true, roles: ["ADMIN", "STORE_OWNER"] },
      actionType: "GENERATE_COUPON",
      actionParams: { storeId: insight.storeId, discountPct: 10 },
      deepLink: insight.storeId ? `/stores/${insight.storeId}/coupons` : "/dashboard",
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
      eligibility: { requiresApproval: false, roles: ["ADMIN", "STORE_OWNER", "STAFF"] },
      actionType: "TAKE_OVER_CONVERSATION",
      actionParams: { storeId: insight.storeId, conversationId },
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
      eligibility: { requiresApproval: true, roles: ["ADMIN", "STORE_OWNER"] },
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: { storeId: insight.storeId, campaignType: "RE_ENGAGE", audienceCriteria: { segment: "existing_followers" } },
      deepLink: insight.storeId ? `/stores/${insight.storeId}/commerce/growth` : "/dashboard",
    };
  }

  if (
    (insight.title.toLowerCase().includes("out of stock") ||
      insight.title.toLowerCase().includes("low stock")) &&
    insight.storeId
  ) {
    const titleMatch = insight.title.match(/^"([^"]+)"/);
    const productTitle = titleMatch?.[1] ?? "";
    if (productTitle) {
      const products = await ecommerce.listProducts(insight.storeId, 100);
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
          eligibility: { requiresApproval: true, roles: ["ADMIN", "STORE_OWNER"] },
          actionType: "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN",
          actionParams: {
            storeId: insight.storeId,
            outOfStockProductTitle: productTitle,
            alternativeProductTitle: alternative.title,
            audienceCriteria: { conversationMentions: productTitle },
          },
          deepLink: `/stores/${insight.storeId}/commerce/growth`,
        };
      }
    }
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
        eligibility: { requiresApproval: true, roles: ["ADMIN", "STORE_OWNER"] },
        actionType: "GENERATE_COUPON",
        actionParams: { storeId: insight.storeId, discountPct: 10, minimumSpendPct: 25 },
        deepLink: insight.storeId ? `/stores/${insight.storeId}/coupons` : "/dashboard",
      };
    }

    if (availabilityDriven && insight.storeId) {
      const products = await ecommerce.listProducts(insight.storeId, 100);
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
          eligibility: { requiresApproval: true, roles: ["ADMIN", "STORE_OWNER"] },
          actionType: "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN",
          actionParams: { storeId: insight.storeId, outOfStockProductTitle: "N/A", alternativeProductTitle: alternative.title, audienceCriteria: { segment: "recent_customers" } },
          deepLink: `/stores/${insight.storeId}/commerce/growth`,
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
      eligibility: { requiresApproval: true, roles: ["ADMIN", "STORE_OWNER"] },
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: { storeId: insight.storeId, campaignType: "RE_ENGAGE", audienceCriteria: { segment: "recent_customers" } },
      deepLink: insight.storeId ? `/stores/${insight.storeId}/commerce/growth` : "/dashboard",
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
    eligibility: { requiresApproval: false, roles: ["ADMIN", "STORE_OWNER", "STAFF"] },
    actionType: "REFRESH_INTEGRATION",
    actionParams: { storeId: insight.storeId, metricNames: insight.evidence?.metricIds ?? [] },
    deepLink: insight.storeId ? `/stores/${insight.storeId}/integrations` : "/dashboard",
  };
}

export function makeRecommendationService(input: RecommendationServiceInput) {
  return {
    async generateFromOpenInsights(organizationId: string, storeId?: string): Promise<RecommendationRecord[]> {
      const insights = await input.insights.listOpen(organizationId, storeId, 50);
      const existing = await input.recommendations.listOpen(organizationId, storeId, 200);
      const seenInsightIds = new Set(existing.map((r) => r.insightId).filter(Boolean));

      const generated: RecommendationRecord[] = [];
      for (const insight of insights) {
        if (seenInsightIds.has(insight.id)) continue;
        const draft = await recommendationFromInsight(insight, input.ecommerce);
        if (!draft) continue;
        const saved = await input.recommendations.save(draft);
        generated.push(saved);
      }
      return generated;
    },

    async listOpen(organizationId: string, storeId?: string, limit = 20): Promise<RecommendationRecord[]> {
      return input.recommendations.listOpen(organizationId, storeId, limit);
    },

    async dismiss(id: string): Promise<RecommendationRecord | null> {
      return input.recommendations.updateStatus(id, "DISMISSED");
    },
  };
}

export type RecommendationService = ReturnType<typeof makeRecommendationService>;

import { signalIngestionService } from "./container";
import {
  signals,
  insights,
  metrics,
  links,
  recommendationService,
  actionPlanService,
  outcomeService,
  dataQualityGateService,
} from "./container";
import { ecommerceQueries, detectCommerceInsights } from "@/modules/ecommerce";
import { conversationQueries, detectConversationInsights } from "@/modules/conversations";
import { crmQueries, detectCrmInsights } from "@/modules/crm";
import { detectGrowthInsights } from "@/modules/growth";
import { detectBrandDealInsights } from "@/modules/branddeals";
import { makeDetectionService } from "../application/detection";

export interface ThinSliceResult {
  revenueInsightId: string | null;
  alternativeProductRecommendationId: string | null;
  actionPlanId: string | null;
  outcomeId: string | null;
  dmCampaignCreated: boolean;
  alternativeProductTitle: string | null;
}

export async function runWeek4ThinSlice(input: {
  userId: string;
  projectId: string;
  userId: string;
  userRole: string;
  outOfStockProductTitle: string;
  alternativeProductTitle: string;
  conversationContent: string;
  now: Date;
}): Promise<ThinSliceResult> {
  const { userId, projectId, userId, userRole, outOfStockProductTitle, alternativeProductTitle, conversationContent, now } = input;

  const oneDay = 24 * 60 * 60 * 1000;
  const occurredAt = new Date(now.getTime() - oneDay);

  await signalIngestionService.ingest({
    eventType: "ProductInventory",
    userId,
    projectId,
    occurredAt,
    source: "shopify",
    subjectType: "product",
    subjectId: outOfStockProductTitle,
    relatedEntities: [{ type: "product", id: outOfStockProductTitle }],
    data: { title: outOfStockProductTitle, inventory: 0 },
    traceId: `trace-thin-${Date.now()}`,
  });

  await signalIngestionService.ingest({
    eventType: "NewMessage",
    userId,
    projectId,
    occurredAt,
    source: "instagram",
    subjectType: "conversation",
    subjectId: `conv-thin-${Date.now()}`,
    relatedEntities: [{ type: "product", id: outOfStockProductTitle }],
    data: { content: conversationContent, channel: "instagram" },
    traceId: `trace-thin-${Date.now()}`,
  });

  const detection = makeDetectionService({
    signals,
    insights,
    metrics,
    links,
    detectCommerceInsights,
    detectCrmInsights,
    detectConversationInsights,
    detectGrowthInsights,
    detectBrandDealInsights,
    ecommerce: ecommerceQueries,
    conversations: conversationQueries,
    crm: crmQueries,
    dataQualityGate: dataQualityGateService,
    now,
  });

  await detection.analyzeStore(userId, projectId);

  const openInsights = await insights.listOpen(userId, projectId, 50);
  const revenueInsight = openInsights.find((i) =>
    i.title.toLowerCase().includes("revenue declined") &&
    i.title.toLowerCase().includes("out-of-stock"),
  ) ?? null;

  await recommendationService.generateFromOpenInsights(userId, projectId);
  const recs = await recommendationService.listOpen(userId, projectId, 50);
  const altRec = recs.find((r) =>
    r.actionType === "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN" &&
    r.actionParams &&
    typeof r.actionParams === "object" &&
    "alternativeProductTitle" in (r.actionParams as Record<string, unknown>) &&
    (r.actionParams as Record<string, unknown>).alternativeProductTitle === alternativeProductTitle,
  ) ?? null;

  if (!altRec) {
    return {
      revenueInsightId: revenueInsight?.id ?? null,
      alternativeProductRecommendationId: null,
      actionPlanId: null,
      outcomeId: null,
      dmCampaignCreated: false,
      alternativeProductTitle: null,
    };
  }

  const plan = await actionPlanService.createFromRecommendation(altRec.id, userId, userId);
  const approved = await actionPlanService.approve(plan.id, userId, userId, userRole);
  const executed = await actionPlanService.execute(approved.id, userId, userId, userRole);

  const measured = await outcomeService.measure(executed.outcome.id, userId, 0, 1, "SUCCESS");

  return {
    revenueInsightId: revenueInsight?.id ?? null,
    alternativeProductRecommendationId: altRec.id,
    actionPlanId: executed.plan.id,
    outcomeId: measured.id,
    dmCampaignCreated: true,
    alternativeProductTitle,
  };
}

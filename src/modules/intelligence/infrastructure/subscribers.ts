import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { organizationQueries } from "@/modules/organizations";
import { crmCommands } from "@/modules/crm";
import type {
  FirstTimeFollowerDetectedPayload,
  CustomerProfileUpdatedPayload,
} from "@/modules/crm";
import { ecommerceQueries } from "@/modules/ecommerce";
import type {
  CouponGeneratedPayload,
  CouponDisabledPayload,
  ProductsSyncedPayload,
} from "@/modules/ecommerce";
import type {
  NewMessagePayload,
  ConversationTakenOverPayload,
  AIResumedPayload,
} from "@/modules/conversations";
import type {
  DmCampaignCreatedPayload,
  DmCampaignSentPayload,
  UgcAssetCollectedPayload,
  AmbassadorEnrolledPayload,
  ReferralConvertedPayload,
} from "@/modules/growth";
import type { BrandDealCreatedPayload } from "@/modules/branddeals";
import {
  signalIngestionService,
  entityResolutionService,
  proactiveNotificationService,
} from "./container";
import type {
  BusinessInsightGeneratedPayload,
  RecommendationGeneratedPayload,
  CompetitorInsightGeneratedPayload,
} from "../domain/events";

async function orgForStore(storeId: string): Promise<string | null> {
  return organizationQueries.getOrganizationIdByStoreId(storeId);
}

const onFirstTimeFollowerDetected: EventHandler = async (event) => {
  const p = event.payload as FirstTimeFollowerDetectedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "FirstTimeFollowerDetected",
    subjectType: "customer",
    subjectId: p.customerId,
    stage: "Discovery",
    relatedEntities: [
      { type: "follower", id: p.followerId },
      { type: "meta-participant", id: p.externalUserId },
    ],
    data: { followerId: p.followerId, externalUserId: p.externalUserId, username: p.username, channel: p.channel },
    source: "crm",
    occurredAt: new Date(),
  });

  await entityResolutionService.resolve({
    organizationId,
    storeId: p.storeId,
    sourceType: "meta-participant",
    sourceId: p.externalUserId,
    targetType: "customer",
    targetId: p.customerId,
    linkType: "same-as",
    confidence: "VERIFIED",
    resolutionMethod: "crm-match",
  });

  await entityResolutionService.resolve({
    organizationId,
    storeId: p.storeId,
    sourceType: "follower",
    sourceId: p.followerId,
    targetType: "customer",
    targetId: p.customerId,
    linkType: "resolves-to",
    confidence: "VERIFIED",
    resolutionMethod: "crm-match",
  });

  logger.info("intelligence.followerSignalIngested", { storeId: p.storeId, customerId: p.customerId });
};

const onCustomerProfileUpdated: EventHandler = async (event) => {
  const p = event.payload as CustomerProfileUpdatedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "CustomerProfileUpdated",
    subjectType: "customer",
    subjectId: p.customerId,
    stage: "Retention",
    data: { tags: p.tags, interests: p.interests },
    source: "crm",
    occurredAt: new Date(),
  });
};

const onCouponGenerated: EventHandler = async (event) => {
  const p = event.payload as CouponGeneratedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  const related = p.customerId ? [{ type: "customer" as const, id: p.customerId }] : [];

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "CouponGenerated",
    subjectType: p.customerId ? "customer" : "store",
    subjectId: p.customerId ?? p.storeId,
    stage: "Consideration",
    relatedEntities: related,
    data: { couponId: p.couponId, code: p.code, discountPct: p.discountPct, customerId: p.customerId },
    source: "ecommerce",
    occurredAt: new Date(),
  });

  if (p.customerId) {
    await entityResolutionService.resolve({
      organizationId,
      storeId: p.storeId,
      sourceType: "coupon",
      sourceId: p.couponId,
      targetType: "customer",
      targetId: p.customerId,
      linkType: "sent-to",
      confidence: "VERIFIED",
      resolutionMethod: "coupon-generation",
    });
  }
};

const onCouponDisabled: EventHandler = async (event) => {
  const p = event.payload as CouponDisabledPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "CouponDisabled",
    subjectType: "store",
    subjectId: p.storeId,
    stage: "Consideration",
    data: { code: p.code },
    source: "ecommerce",
    occurredAt: new Date(),
  });
};

const onProductsSynced: EventHandler = async (event) => {
  const p = event.payload as ProductsSyncedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "ProductsSynced",
    subjectType: "store",
    subjectId: p.storeId,
    stage: "Advocacy",
    data: { provider: p.provider, count: p.count },
    source: "ecommerce",
    occurredAt: new Date(),
  });

  for (const product of p.products) {
    await signalIngestionService.ingest({
      organizationId,
      storeId: p.storeId,
      eventType: "ProductInventory",
      subjectType: "product",
      subjectId: product.externalId,
      stage: "Consideration",
      data: { title: product.title, inventory: product.inventory, provider: p.provider },
      source: "ecommerce",
      occurredAt: new Date(),
    });
  }
};

const SUPPORT_KEYWORDS = ["return", "refund", "broken", "issue", "complaint", "support", "wrong", "missing", "damaged", "angry"];
const INTENT_KEYWORDS = ["buy", "order", "purchase", "price", "discount", "interested", "how much", "available", "ship", "checkout"];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lowered = text.toLowerCase();
  return keywords.some((k) => lowered.includes(k));
}

const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  let customerId = p.customerId;
  if (!customerId && p.externalUserId) {
    try {
      const customer = await crmCommands.upsertByExternalId({
        storeId: p.storeId,
        channel: p.channel,
        externalUserId: p.externalUserId,
        username: null,
      });
      customerId = customer.id;
    } catch (err) {
      logger.warn("intelligence.onNewMessage.upsertCustomerFailed", { storeId: p.storeId, externalUserId: p.externalUserId, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  const related: Array<{ type: string; id: string }> = [];
  if (customerId) related.push({ type: "customer", id: customerId });

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "NewMessage",
    subjectType: "conversation",
    subjectId: p.conversationId,
    stage: "Engagement",
    relatedEntities: related,
    data: { externalUserId: p.externalUserId, channel: p.channel, content: p.content },
    source: "conversations",
    occurredAt: new Date(),
  });

  if (customerId) {
    await entityResolutionService.resolve({
      organizationId,
      storeId: p.storeId,
      sourceType: "conversation",
      sourceId: p.conversationId,
      targetType: "customer",
      targetId: customerId,
      linkType: "involves",
      confidence: "PROBABLE",
      resolutionMethod: "conversation-association",
    });
  }

  // Inbox ↔ Orders/Products: detect product mentions and write them to the timeline.
  const products = await ecommerceQueries.listProducts(p.storeId, 100);
  const mentioned = products.filter((prod) => p.content.toLowerCase().includes(prod.title.toLowerCase()));
  for (const product of mentioned) {
    await signalIngestionService.ingest({
      organizationId,
      storeId: p.storeId,
      eventType: "ProductMentioned",
      subjectType: "conversation",
      subjectId: p.conversationId,
      stage: "Consideration",
      relatedEntities: [
        ...(customerId ? [{ type: "customer" as const, id: customerId }] : []),
        { type: "product", id: product.id },
      ],
      data: { productTitle: product.title, productId: product.id, externalUserId: p.externalUserId },
      source: "conversations",
      occurredAt: new Date(),
    });
  }

  // Inbox ↔ CRM: write intent and support flags to the timeline.
  if (containsKeyword(p.content, SUPPORT_KEYWORDS)) {
    await signalIngestionService.ingest({
      organizationId,
      storeId: p.storeId,
      eventType: "SupportIssueRaised",
      subjectType: "conversation",
      subjectId: p.conversationId,
      stage: "Retention",
      relatedEntities: customerId ? [{ type: "customer", id: customerId }] : [],
      data: { externalUserId: p.externalUserId, channel: p.channel, reason: "support keywords detected" },
      source: "conversations",
      occurredAt: new Date(),
    });
  }

  if (containsKeyword(p.content, INTENT_KEYWORDS)) {
    await signalIngestionService.ingest({
      organizationId,
      storeId: p.storeId,
      eventType: "HighIntentConversation",
      subjectType: "conversation",
      subjectId: p.conversationId,
      stage: "Consideration",
      relatedEntities: customerId ? [{ type: "customer", id: customerId }] : [],
      data: { externalUserId: p.externalUserId, channel: p.channel, reason: "intent keywords detected" },
      source: "conversations",
      occurredAt: new Date(),
    });
  }
};

const onConversationTakenOver: EventHandler = async (event) => {
  const p = event.payload as ConversationTakenOverPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  const related: Array<{ type: string; id: string }> = [{ type: "human", id: p.humanUserId }];
  if (p.customerId) related.push({ type: "customer", id: p.customerId });

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "ConversationTakenOver",
    subjectType: "conversation",
    subjectId: p.conversationId,
    stage: "Engagement",
    relatedEntities: related,
    data: { humanUserId: p.humanUserId, customerId: p.customerId },
    source: "conversations",
    occurredAt: new Date(),
  });

  if (p.customerId) {
    await entityResolutionService.resolve({
      organizationId,
      storeId: p.storeId,
      sourceType: "conversation",
      sourceId: p.conversationId,
      targetType: "customer",
      targetId: p.customerId,
      linkType: "involves",
      confidence: "PROBABLE",
      resolutionMethod: "conversation-association",
    });
  }
};

const onAIResumed: EventHandler = async (event) => {
  const p = event.payload as AIResumedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  const related: Array<{ type: string; id: string }> = [];
  if (p.customerId) related.push({ type: "customer", id: p.customerId });

  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "AIResumed",
    subjectType: "conversation",
    subjectId: p.conversationId,
    stage: "Engagement",
    relatedEntities: related,
    data: { customerId: p.customerId },
    source: "conversations",
    occurredAt: new Date(),
  });

  if (p.customerId) {
    await entityResolutionService.resolve({
      organizationId,
      storeId: p.storeId,
      sourceType: "conversation",
      sourceId: p.conversationId,
      targetType: "customer",
      targetId: p.customerId,
      linkType: "involves",
      confidence: "PROBABLE",
      resolutionMethod: "conversation-association",
    });
  }
};

const onBusinessInsightGenerated: EventHandler = async (event) => {
  const p = event.payload as BusinessInsightGeneratedPayload;
  try {
    await proactiveNotificationService.notifyInsight(p.insight);
  } catch (err) {
    logger.warn("intelligence.onBusinessInsightGenerated.notifyFailed", { insightId: p.insight.id, error: err instanceof Error ? err.message : "unknown" });
  }
};

const onRecommendationGenerated: EventHandler = async (event) => {
  const p = event.payload as RecommendationGeneratedPayload;
  try {
    await proactiveNotificationService.notifyRecommendation(p.recommendation);
  } catch (err) {
    logger.warn("intelligence.onRecommendationGenerated.notifyFailed", { recommendationId: p.recommendation.id, error: err instanceof Error ? err.message : "unknown" });
  }
};

const onDmCampaignCreated: EventHandler = async (event) => {
  const p = event.payload as DmCampaignCreatedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "DmCampaignCreated",
    subjectType: "campaign",
    subjectId: p.campaignId,
    stage: "Consideration",
    data: { campaignType: p.campaignType, status: p.status },
    source: "growth",
    occurredAt: new Date(),
  });
};

const onDmCampaignSent: EventHandler = async (event) => {
  const p = event.payload as DmCampaignSentPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "DmCampaignSent",
    subjectType: "campaign",
    subjectId: p.campaignId,
    stage: "Consideration",
    data: { sentAt: p.sentAt },
    source: "growth",
    occurredAt: new Date(),
  });
};

const onUgcAssetCollected: EventHandler = async (event) => {
  const p = event.payload as UgcAssetCollectedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "UgcAssetCollected",
    subjectType: "content",
    subjectId: p.assetId,
    stage: "Discovery",
    relatedEntities: [{ type: "customer", id: p.creatorHandle ?? "unknown" }],
    data: { creatorHandle: p.creatorHandle, source: p.source },
    source: "growth",
    occurredAt: new Date(),
  });
};

const onAmbassadorEnrolled: EventHandler = async (event) => {
  const p = event.payload as AmbassadorEnrolledPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "AmbassadorEnrolled",
    subjectType: "customer",
    subjectId: p.ambassadorId,
    stage: "Advocacy",
    data: { code: p.code, discountPct: p.discountPct, commissionPct: p.commissionPct },
    source: "growth",
    occurredAt: new Date(),
  });
};

const onReferralConverted: EventHandler = async (event) => {
  const p = event.payload as ReferralConvertedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "ReferralConverted",
    subjectType: "order",
    subjectId: p.orderId,
    stage: "Purchase",
    relatedEntities: [
      { type: "customer", id: p.ambassadorId },
      { type: "order", id: p.orderId },
    ],
    data: { orderAmount: p.orderAmount, commissionAmount: p.commissionAmount },
    source: "growth",
    occurredAt: new Date(),
  });
};

const onBrandDealCreated: EventHandler = async (event) => {
  const p = event.payload as BrandDealCreatedPayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.storeId,
    eventType: "BrandDealCreated",
    subjectType: "brand-deal",
    subjectId: p.dealId,
    stage: "Discovery",
    data: { brandName: p.brandName, value: p.value },
    source: "branddeals",
    occurredAt: new Date(),
  });
};

const onCompetitorInsightGenerated: EventHandler = async (event) => {
  const p = event.payload as CompetitorInsightGeneratedPayload;
  if (!p.insight.storeId) return;
  const organizationId = await orgForStore(p.insight.storeId);
  if (!organizationId) return;
  await signalIngestionService.ingest({
    organizationId,
    storeId: p.insight.storeId,
    eventType: "CompetitorInsightGenerated",
    subjectType: "market",
    subjectId: p.insight.id,
    stage: "Discovery",
    data: { competitorHandle: p.insight.competitorHandle, metricName: p.insight.metricName, value: p.insight.value },
    source: "intelligence",
    occurredAt: new Date(),
  });
};

export function registerIntelligenceSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("FirstTimeFollowerDetected", onFirstTimeFollowerDetected);
  bus.subscribe("CustomerProfileUpdated", onCustomerProfileUpdated);
  bus.subscribe("CouponGenerated", onCouponGenerated);
  bus.subscribe("CouponDisabled", onCouponDisabled);
  bus.subscribe("ProductsSynced", onProductsSynced);
  bus.subscribe("NewMessage", onNewMessage);
  bus.subscribe("ConversationTakenOver", onConversationTakenOver);
  bus.subscribe("AIResumed", onAIResumed);
  bus.subscribe("BusinessInsightGenerated", onBusinessInsightGenerated);
  bus.subscribe("RecommendationGenerated", onRecommendationGenerated);
  bus.subscribe("DmCampaignCreated", onDmCampaignCreated);
  bus.subscribe("DmCampaignSent", onDmCampaignSent);
  bus.subscribe("UgcAssetCollected", onUgcAssetCollected);
  bus.subscribe("AmbassadorEnrolled", onAmbassadorEnrolled);
  bus.subscribe("ReferralConverted", onReferralConverted);
  bus.subscribe("BrandDealCreated", onBrandDealCreated);
  bus.subscribe("CompetitorInsightGenerated", onCompetitorInsightGenerated);
}

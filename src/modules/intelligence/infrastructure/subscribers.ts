import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { SUPPORT_KEYWORDS, INTENT_KEYWORDS, containsKeyword, detectProductMentions } from "../application/vocabulary";
import { organizationQueries } from "@/modules/workspaces";
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
import type {
  MetaMessageReceivedPayload,
  MetaFollowReceivedPayload,
  MetaCommentReceivedPayload,
} from "@/modules/meta";
import {
  signalIngestionService,
  entityResolutionService,
  proactiveNotificationService,
  journeyService,
} from "./container";
import type {
  BusinessInsightGeneratedPayload,
  RecommendationGeneratedPayload,
  CompetitorInsightGeneratedPayload,
} from "../domain/events";

async function orgForStore(projectId: string): Promise<string | null> {
  return organizationQueries.getOrganizationIdByStoreId(projectId);
}

const onFirstTimeFollowerDetected: EventHandler = async (event) => {
  const p = event.payload as FirstTimeFollowerDetectedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
    userId,
    projectId: p.projectId,
    sourceType: "meta-participant",
    sourceId: p.externalUserId,
    targetType: "customer",
    targetId: p.customerId,
    linkType: "same-as",
    confidence: "VERIFIED",
    resolutionMethod: "crm-match",
  });

  await entityResolutionService.resolve({
    userId,
    projectId: p.projectId,
    sourceType: "follower",
    sourceId: p.followerId,
    targetType: "customer",
    targetId: p.customerId,
    linkType: "resolves-to",
    confidence: "VERIFIED",
    resolutionMethod: "crm-match",
  });

  logger.info("intelligence.followerSignalIngested", { projectId: p.projectId, customerId: p.customerId });
};

const onCustomerProfileUpdated: EventHandler = async (event) => {
  const p = event.payload as CustomerProfileUpdatedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  const related = p.customerId ? [{ type: "customer" as const, id: p.customerId }] : [];

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
    eventType: "CouponGenerated",
    subjectType: p.customerId ? "customer" : "store",
    subjectId: p.customerId ?? p.projectId,
    stage: "Consideration",
    relatedEntities: related,
    data: { couponId: p.couponId, code: p.code, discountPct: p.discountPct, customerId: p.customerId },
    source: "ecommerce",
    occurredAt: new Date(),
  });

  if (p.customerId) {
    await entityResolutionService.resolve({
      userId,
      projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
    eventType: "CouponDisabled",
    subjectType: "store",
    subjectId: p.projectId,
    stage: "Consideration",
    data: { code: p.code },
    source: "ecommerce",
    occurredAt: new Date(),
  });
};

const onProductsSynced: EventHandler = async (event) => {
  const p = event.payload as ProductsSyncedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
    eventType: "ProductsSynced",
    subjectType: "store",
    subjectId: p.projectId,
    stage: "Advocacy",
    data: { provider: p.provider, count: p.count },
    source: "ecommerce",
    occurredAt: new Date(),
  });

  for (const product of p.products) {
    await signalIngestionService.ingest({
      userId,
      projectId: p.projectId,
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

const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  let customerId = p.customerId;
  if (!customerId && p.externalUserId) {
    try {
      const customer = await crmCommands.upsertByExternalId({
        projectId: p.projectId,
        channel: p.channel,
        externalUserId: p.externalUserId,
        username: null,
      });
      customerId = customer.id;
    } catch (err) {
      logger.warn("intelligence.onNewMessage.upsertCustomerFailed", { projectId: p.projectId, externalUserId: p.externalUserId, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  const related: Array<{ type: string; id: string }> = [];
  if (customerId) related.push({ type: "customer", id: customerId });

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
      userId,
      projectId: p.projectId,
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
  const products = await ecommerceQueries.listProducts(p.projectId, 100);
  const mentioned = detectProductMentions(
    p.content,
    products.map((p) => ({ externalId: p.externalId, title: p.title })),
  );
  for (const product of products.filter((p) => mentioned.some((m) => m.externalId === p.externalId))) {
    await signalIngestionService.ingest({
      userId,
      projectId: p.projectId,
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
      userId,
      projectId: p.projectId,
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
      userId,
      projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  const related: Array<{ type: string; id: string }> = [{ type: "human", id: p.humanUserId }];
  if (p.customerId) related.push({ type: "customer", id: p.customerId });

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
      userId,
      projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;

  const related: Array<{ type: string; id: string }> = [];
  if (p.customerId) related.push({ type: "customer", id: p.customerId });

  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
      userId,
      projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.projectId,
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
  if (!p.insight.projectId) return;
  const userId = await orgForStore(p.insight.projectId);
  if (!userId) return;
  await signalIngestionService.ingest({
    userId,
    projectId: p.insight.projectId,
    eventType: "CompetitorInsightGenerated",
    subjectType: "market",
    subjectId: p.insight.id,
    stage: "Discovery",
    data: { competitorHandle: p.insight.competitorHandle, metricName: p.insight.metricName, value: p.insight.value },
    source: "intelligence",
    occurredAt: new Date(),
  });
};

// ── Journey attribution (spec 0050) ─────────────────────────────────────────
// Link Meta post views, profile visits, DMs, coupon sends, and orders into one journey.

async function appendJourneySafely(
  input: Parameters<typeof journeyService.appendTouchpoint>[0],
  context: Record<string, unknown>,
): Promise<void> {
  try {
    await journeyService.appendTouchpoint(input);
  } catch (err) {
    logger.warn("intelligence.journeyTouchpointFailed", { ...context, error: err instanceof Error ? err.message : "unknown" });
  }
}

const onMetaCommentReceivedJourney: EventHandler = async (event) => {
  const p = event.payload as MetaCommentReceivedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await appendJourneySafely(
    {
      userId,
      projectId: p.projectId,
      externalUserId: p.externalUserId,
      channel: p.channel,
      attributedPostId: p.postId,
      step: { type: "POST_VIEW", externalId: p.postId, channel: p.channel, details: { text: p.text } },
    },
    { projectId: p.projectId, step: "POST_VIEW" },
  );
};

const onMetaFollowReceivedJourney: EventHandler = async (event) => {
  const p = event.payload as MetaFollowReceivedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await appendJourneySafely(
    {
      userId,
      projectId: p.projectId,
      externalUserId: p.externalUserId,
      channel: p.channel,
      step: { type: "PROFILE_VISIT", externalId: p.externalUserId, channel: p.channel, details: { username: p.username } },
    },
    { projectId: p.projectId, step: "PROFILE_VISIT" },
  );
};

const onMetaMessageReceivedJourney: EventHandler = async (event) => {
  const p = event.payload as MetaMessageReceivedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await appendJourneySafely(
    {
      userId,
      projectId: p.projectId,
      externalUserId: p.externalUserId,
      channel: p.channel,
      step: { type: "DM", externalId: p.externalConversationId, channel: p.channel, details: { text: p.text } },
    },
    { projectId: p.projectId, step: "DM" },
  );
};

const onCouponGeneratedJourney: EventHandler = async (event) => {
  const p = event.payload as CouponGeneratedPayload;
  if (!p.customerId) return;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await appendJourneySafely(
    {
      userId,
      projectId: p.projectId,
      customerId: p.customerId,
      step: { type: "COUPON_SENT", externalId: p.couponId, details: { code: p.code, discountPct: p.discountPct } },
    },
    { projectId: p.projectId, step: "COUPON_SENT" },
  );
};

const onReferralConvertedJourney: EventHandler = async (event) => {
  const p = event.payload as ReferralConvertedPayload;
  const userId = await orgForStore(p.projectId);
  if (!userId) return;
  await appendJourneySafely(
    {
      userId,
      projectId: p.projectId,
      customerId: p.ambassadorId,
      outcome: "PURCHASE",
      attributedRevenue: p.orderAmount,
      step: { type: "ORDER", externalId: p.orderId, details: { orderAmount: p.orderAmount } },
    },
    { projectId: p.projectId, step: "ORDER" },
  );
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

  // Journey attribution touchpoints.
  bus.subscribe("MetaCommentReceived", onMetaCommentReceivedJourney);
  bus.subscribe("MetaFollowReceived", onMetaFollowReceivedJourney);
  bus.subscribe("MetaMessageReceived", onMetaMessageReceivedJourney);
  bus.subscribe("CouponGenerated", onCouponGeneratedJourney);
  bus.subscribe("ReferralConverted", onReferralConvertedJourney);
}

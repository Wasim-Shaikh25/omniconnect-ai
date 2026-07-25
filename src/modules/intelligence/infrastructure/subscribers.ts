import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { organizationQueries } from "@/modules/organizations";
import type {
  FirstTimeFollowerDetectedPayload,
  CustomerProfileUpdatedPayload,
} from "@/modules/crm";
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
import {
  signalIngestionService,
  entityResolutionService,
} from "./container";

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
};

const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  const organizationId = await orgForStore(p.storeId);
  if (!organizationId) return;

  const related: Array<{ type: string; id: string }> = [];
  if (p.customerId) related.push({ type: "customer", id: p.customerId });

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

export function registerIntelligenceSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("FirstTimeFollowerDetected", onFirstTimeFollowerDetected);
  bus.subscribe("CustomerProfileUpdated", onCustomerProfileUpdated);
  bus.subscribe("CouponGenerated", onCouponGenerated);
  bus.subscribe("CouponDisabled", onCouponDisabled);
  bus.subscribe("ProductsSynced", onProductsSynced);
  bus.subscribe("NewMessage", onNewMessage);
  bus.subscribe("ConversationTakenOver", onConversationTakenOver);
  bus.subscribe("AIResumed", onAIResumed);
}

import { BaseDomainEvent } from "@/shared/kernel";
import type { ConversationChannel } from "../application/ports";

export interface NewMessagePayload {
  conversationId: string;
  storeId: string;
  channel: ConversationChannel;
  externalUserId: string;
  customerId: string | null;
  content: string;
}

/**
 * Emitted after a new customer message is appended to a conversation.
 * The AI assistant subscribes to generate a reply.
 */
export class NewMessage extends BaseDomainEvent<NewMessagePayload> {
  readonly name = "NewMessage";
}

export interface ConversationTakenOverPayload {
  conversationId: string;
  storeId: string;
  humanUserId: string;
  customerId: string | null;
}

export class ConversationTakenOver extends BaseDomainEvent<ConversationTakenOverPayload> {
  readonly name = "ConversationTakenOver";
}

export interface AIResumedPayload {
  conversationId: string;
  storeId: string;
  customerId: string | null;
}

export class AIResumed extends BaseDomainEvent<AIResumedPayload> {
  readonly name = "AIResumed";
}

export interface ConversationInsight {
  organizationId: string;
  storeId: string;
  conversationId: string;
  type: "RISK" | "OPPORTUNITY" | "ANOMALY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "DISMISSED" | "SNOOZED";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface ConversationRecommendation {
  organizationId: string;
  storeId: string;
  conversationId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface ConversationInsightGeneratedPayload {
  organizationId: string;
  storeId: string;
  conversationId: string;
  insight: ConversationInsight;
}

export class ConversationInsightGenerated extends BaseDomainEvent<ConversationInsightGeneratedPayload> {
  readonly name = "ConversationInsightGenerated";
}

export interface ConversationRecommendationGeneratedPayload {
  organizationId: string;
  storeId: string;
  conversationId: string;
  recommendation: ConversationRecommendation;
}

export class ConversationRecommendationGenerated extends BaseDomainEvent<ConversationRecommendationGeneratedPayload> {
  readonly name = "ConversationRecommendationGenerated";
}

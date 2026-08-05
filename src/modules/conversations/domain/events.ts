import { BaseDomainEvent } from "@/shared/kernel";
import type { ConversationChannel } from "../application/ports";

export interface NewMessagePayload {
  conversationId: string;
  projectId: string;
  channel: ConversationChannel;
  externalUserId: string;
  customerId: string | null;
  content: string;
  messageId: string;
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
  projectId: string;
  humanUserId: string;
  customerId: string | null;
}

export class ConversationTakenOver extends BaseDomainEvent<ConversationTakenOverPayload> {
  readonly name = "ConversationTakenOver";
}

export interface AIResumedPayload {
  conversationId: string;
  projectId: string;
  customerId: string | null;
}

export class AIResumed extends BaseDomainEvent<AIResumedPayload> {
  readonly name = "AIResumed";
}

export interface ConversationInsight {
  userId: string;
  projectId: string;
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
  userId: string;
  projectId: string;
  conversationId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface ConversationInsightGeneratedPayload {
  userId: string;
  projectId: string;
  conversationId: string;
  insight: ConversationInsight;
}

export class ConversationInsightGenerated extends BaseDomainEvent<ConversationInsightGeneratedPayload> {
  readonly name = "ConversationInsightGenerated";
}

export interface ConversationRecommendationGeneratedPayload {
  userId: string;
  projectId: string;
  conversationId: string;
  recommendation: ConversationRecommendation;
}

export class ConversationRecommendationGenerated extends BaseDomainEvent<ConversationRecommendationGeneratedPayload> {
  readonly name = "ConversationRecommendationGenerated";
}

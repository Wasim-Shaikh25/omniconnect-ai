import { BaseDomainEvent } from "@/shared/kernel";

export interface ReplyGeneratedPayload {
  conversationId: string;
  projectId: string;
  externalUserId: string | null;
  text: string;
}

/**
 * Emitted when the AI assistant has generated a reply. Consumers may deliver
 * it through outbound channels (Meta Graph API) and surface it in dashboards.
 */
export class ReplyGenerated extends BaseDomainEvent<ReplyGeneratedPayload> {
  readonly name = "ReplyGenerated";
}

export interface EscalationRequestedPayload {
  conversationId: string;
  projectId: string;
  externalUserId: string | null;
  reason: string;
}

/**
 * Emitted when the AI assistant decides a conversation needs a human agent.
 * The human-takeover module (TASK-090) will subscribe to this.
 */
export class EscalationRequested extends BaseDomainEvent<EscalationRequestedPayload> {
  readonly name = "EscalationRequested";
}

/**
 * Conversations module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/conversations`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Conversation state & human takeover.
 * Public contract (to implement): ConversationService (takeOver, resumeAI, getStatus); events: ConversationTakenOver, AIResumed.
 */
export const MODULE_NAME = "conversations" as const;

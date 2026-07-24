/**
 * Ai module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/ai`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Configurable, multi-model-ready AI customer assistant.
 * Public contract (to implement): AIProvider interface (complete); AssistantService (generateReply); events: ReplyGenerated, EscalationRequested.
 */
export const MODULE_NAME = "ai" as const;

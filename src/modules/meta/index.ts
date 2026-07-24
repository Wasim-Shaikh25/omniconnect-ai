/**
 * Meta module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/meta`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Facebook/Instagram integration via webhooks and Graph APIs.
 * Public contract (to implement): MetaService (sendMessage, getConversation, listPages); events: NewFollow, NewMessage, Comment, Mention, PageInteraction.
 */
export const MODULE_NAME = "meta" as const;

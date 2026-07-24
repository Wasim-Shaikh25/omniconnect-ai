/**
 * Crm module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/crm`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Customer memory system for personalization.
 * Public contract (to implement): CustomerMemory (getProfile, recordInteraction, tag, recordCoupon); events: FirstInteractionDetected, CustomerProfileUpdated.
 */
export const MODULE_NAME = "crm" as const;

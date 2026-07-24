/**
 * Analytics module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/analytics`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Engagement/growth read models & metrics.
 * Public contract (to implement): AnalyticsService (getMetrics); builds CQRS read models from domain events.
 */
export const MODULE_NAME = "analytics" as const;

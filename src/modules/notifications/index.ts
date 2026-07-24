/**
 * Notifications module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/notifications`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: In-app + email notifications across events.
 * Public contract (to implement): Notifier (notify); channel adapters (in-app, email); subscribes to cross-module events.
 */
export const MODULE_NAME = "notifications" as const;

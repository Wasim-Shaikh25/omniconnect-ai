/**
 * Organizations module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/organizations`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Multi-tenant organizations owning stores and members.
 * Public contract (to implement): OrganizationService (create, addMember); events: OrganizationCreated.
 */
export const MODULE_NAME = "organizations" as const;

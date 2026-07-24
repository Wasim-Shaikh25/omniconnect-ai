/**
 * Users module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/users`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: User profile management.
 * Public contract (to implement): UserService (getProfile, updateProfile); events: UserProfileUpdated.
 */
export const MODULE_NAME = "users" as const;

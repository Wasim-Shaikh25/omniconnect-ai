/**
 * Auth module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/auth`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Authentication & RBAC (Email + Google, JWT sessions, roles Admin/Store Owner/Staff).
 * Public contract (to implement): AuthService (authenticate, getSession, assertRole); events: UserRegistered, UserLoggedIn, UserRoleChanged.
 */
export const MODULE_NAME = "auth" as const;

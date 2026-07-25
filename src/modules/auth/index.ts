/**
 * Auth module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/auth`.
 * Exposes RBAC helpers, session accessors, domain events, and use-cases —
 * never internal entities, repositories, or the raw NextAuth instance.
 */
export const MODULE_NAME = "auth" as const;

// Domain — RBAC
export { ROLES, isRole, roleSatisfies } from "./domain/role";
export type { Role } from "./domain/role";
export {
  AuthError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  UnauthorizedError,
  ForbiddenError,
} from "./domain/errors";

// Domain — events (for cross-module subscribers)
export { UserRegistered, UserLoggedIn } from "./domain/events";
export type {
  UserRegisteredPayload,
  UserLoggedInPayload,
} from "./domain/events";

// Application — use-cases
export { registerUserSchema } from "./application/register-user";
export type { RegisterUserInput, RegisteredUser } from "./application/register-user";

// Session accessors (RBAC entry points for other modules' presentation layers)
export {
  getCurrentUser,
  requireUser,
  requireRole,
} from "./infrastructure/session";
export type { SessionUser } from "./infrastructure/session";

// Presentation wiring for the app composition root (route handlers + server actions)
export { handlers } from "./infrastructure/auth";
export { oauthProviders, type OAuthProvider } from "./infrastructure/auth";
export {
  loginAction,
  registerAction,
  signOutAction,
  oauthSignInAction,
} from "./presentation/actions";
export type { ActionState } from "./presentation/actions";

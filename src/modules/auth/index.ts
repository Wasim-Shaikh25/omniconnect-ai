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
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  passwordRuleDescription,
} from "./domain/password-policy";
export { isE164Phone } from "./domain/phone";
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
export type {
  RegisterUserInput,
  RegisteredUser,
  RegisterUserOptions,
} from "./application/register-user";
export { registerUser } from "./infrastructure/container";

// Session accessors (RBAC entry points for other modules' presentation layers)
export {
  getCurrentUser,
  requireUser,
  requireRole,
  requireSuperAdmin,
  requireVerifiedEmail,
} from "./infrastructure/session";
export type { SessionUser } from "./infrastructure/session";

// Verification and bot protection use-cases
export { emailVerificationService } from "./infrastructure/container";
export type { EmailVerificationService } from "./application/email-verification";
export { verifyTurnstileToken } from "./infrastructure/turnstile";

// Password and email change use-cases
export { changePasswordService } from "./infrastructure/container";
export { changeEmailService } from "./infrastructure/container";
export type { ChangePasswordService } from "./application/change-password";
export type { ChangeEmailService } from "./application/change-email";

// Presentation wiring for the app composition root (route handlers + server actions + middleware)
export { handlers, signIn, signOut, unstable_update, auth } from "./infrastructure/auth";
export { oauthProviders, type OAuthProvider } from "./infrastructure/auth";
export {
  loginAction,
  registerAction,
  signOutAction,
  oauthSignInAction,
  requestPasswordResetAction,
  resetPasswordAction,
  resendVerificationEmailAction,
  changePasswordAction,
  requestEmailChangeAction,
} from "./presentation/actions";
export type { ActionState } from "./presentation/actions";

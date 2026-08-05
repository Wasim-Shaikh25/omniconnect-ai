/**
 * Auth module — domain-only public barrel.
 *
 * Use this entry point from other modules' application/domain layers to avoid
 * pulling in NextAuth/Next.js server-only code through the main `auth` barrel.
 */
export { ROLES, isRole, roleSatisfies, isStaff } from "./domain/role";
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
export { UserRegistered, UserLoggedIn } from "./domain/events";
export type { UserRegisteredPayload, UserLoggedInPayload } from "./domain/events";

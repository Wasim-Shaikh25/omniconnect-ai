/**
 * Users module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/users`.
 * Owns user profile + membership + role changes on the `User` table.
 */
export const MODULE_NAME = "users" as const;

// Domain
export { UserError, UserNotFoundError } from "./domain/errors";
export { UserProfileUpdated, UserRoleChanged } from "./domain/events";
export type {
  UserProfileUpdatedPayload,
  UserRoleChangedPayload,
} from "./domain/events";

// Application
export { updateProfileSchema } from "./application/update-profile";
export type { UpdateProfileInput } from "./application/update-profile";
export { changeRoleSchema } from "./application/change-role";
export type { ChangeRoleInput } from "./application/change-role";
export type { UserProfile } from "./application/ports";
export type {
  AuditLogRecord,
  CreateAuditLogInput,
} from "./application/audit-ports";

// Queries + use-cases (composed)
export {
  getUserProfile,
  listOrganizationUsers,
  listAllUsers,
  countOrganizationUsers,
  updateProfile,
  setUserOrganization,
  auditQueries,
  auditCommands,
} from "./infrastructure/container";

// Presentation + bootstrap wiring
export {
  updateProfileAction,
  changeUserRoleAction,
  listAllUsersAction,
  toggleUserSuperAdminAction,
} from "./presentation/actions";
export type { ProfileActionState } from "./presentation/actions";
export { registerUsersSubscribers } from "./infrastructure/subscribers";

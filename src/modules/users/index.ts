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
export type { UserProfile, ExportRequestRecord, UserListFilter } from "./application/ports";
export type {
  AuditLogRecord,
  CreateAuditLogInput,
  AuditLogQueries,
  AuditLogCommands,
} from "./application/audit-ports";
export type { UserDataExport } from "./application/data-export";

// Queries + use-cases (composed)
export {
  userRepository,
  getUserProfile,
  listOrganizationUsers,
  listAllUsers,
  countOrganizationUsers,
  updateProfile,
  setUserOrganization,
  setUserSuspended,
  setUserBanned,
  auditQueries,
  auditCommands,
  dataExportService,
  deleteAccountService,
  removeUserFromOrganization,
} from "./infrastructure/container";

// Presentation + bootstrap wiring
export {
  updateProfileAction,
  changeUserRoleAction,
  changeUserStoreAction,
  listAllUsersAction,
  toggleUserSuperAdminAction,
  suspendUserAction,
  banUserAction,
  requestDataExportAction,
  listDataExportsAction,
  deleteAccountAction,
} from "./presentation/actions";
export type { ProfileActionState } from "./presentation/actions";
export { registerUsersSubscribers } from "./infrastructure/subscribers";

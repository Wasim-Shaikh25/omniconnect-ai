/**
 * Organizations module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/organizations`.
 * Owns the Organization + Store tables. Exposes queries, use-cases, events, and
 * the server action / subscriber-registration for the app composition root.
 */
export const MODULE_NAME = "organizations" as const;

// Domain
export {
  ECOMMERCE_PROVIDERS,
  isEcommerceProvider,
} from "./domain/provider";
export type { EcommerceProvider } from "./domain/provider";
export { Plan, isPlan, parsePlan, PLAN_FEATURES } from "./domain/plan";
export {
  OrganizationError,
  OrganizationNotFoundError,
  StoreLimitError,
  SeatLimitError,
} from "./domain/errors";
export { OrganizationCreated, StoreCreated } from "./domain/events";
export type {
  OrganizationCreatedPayload,
  StoreCreatedPayload,
} from "./domain/events";

// Application
export { createStoreSchema } from "./application/create-store";
export type { CreateStoreInput } from "./application/create-store";
export { createOrganizationSchema } from "./application/create-organization";
export type { CreateOrganizationInput } from "./application/create-organization";
export type {
  OrganizationRecord,
  StoreRecord,
  ProjectRecord,
  ProjectMemberRole,
} from "./application/ports";
export type { OrganizationOverview } from "./application/queries";
export { createProjectSchema } from "./application/project";
export { inviteMemberSchema } from "./application/invite-member";
export type { InviteMemberInput } from "./application/invite-member";

// Billing errors for webhook classification
export {
  BillingSignatureError,
  BillingConfigurationError,
} from "./application/billing";

// Queries + use-cases (composed)
export {
  organizationQueries,
  organizationUsage,
  createOrganization,
  createStore,
  tenantGuard,
  billingService,
  createSaaSCoupon,
  validateSaaSCoupon,
  saasCouponRepository,
  inviteMember,
  validateOrganizationInvite,
  acceptOrganizationInvite,
} from "./infrastructure/container";

// Presentation + bootstrap wiring
export {
  createStoreAction,
  completeOnboardingAction,
  listAllOrganizationsAction,
} from "./presentation/actions";
export type { OnboardingActionState } from "./presentation/actions";
export type { StoreActionState } from "./presentation/actions";
export {
  createSaaSCouponAction,
  listSaaSCouponsAction,
} from "./presentation/saas-coupon.actions";
export type { CouponActionState } from "./presentation/saas-coupon.actions";
export {
  inviteOrganizationMemberAction,
  registerWithInviteAction,
} from "./presentation/invite-member.actions";
export type { InviteMemberActionState } from "./presentation/invite-member.actions";
export {
  createProjectAction,
  listProjectsAction,
  getProjectAction,
  archiveProjectAction,
  addProjectMemberAction,
  removeProjectMemberAction,
} from "./presentation/project-actions";
export type { ProjectActionState } from "./presentation/project-actions";
export type { ProjectMemberRecord } from "./application/ports";
export { registerOrganizationSubscribers } from "./infrastructure/subscribers";

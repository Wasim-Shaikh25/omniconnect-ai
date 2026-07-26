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
} from "./domain/errors";
export { OrganizationCreated, StoreCreated } from "./domain/events";
export type {
  OrganizationCreatedPayload,
  StoreCreatedPayload,
} from "./domain/events";

// Application
export { createStoreSchema } from "./application/create-store";
export type { CreateStoreInput } from "./application/create-store";
export type {
  OrganizationRecord,
  StoreRecord,
} from "./application/ports";
export type { OrganizationOverview } from "./application/queries";

// Queries + use-cases (composed)
export {
  organizationQueries,
  createStore,
  tenantGuard,
  billingService,
  createSaaSCoupon,
  validateSaaSCoupon,
  saasCouponRepository,
} from "./infrastructure/container";

// Presentation + bootstrap wiring
export {
  createStoreAction,
  listAllOrganizationsAction,
} from "./presentation/actions";
export type { StoreActionState } from "./presentation/actions";
export {
  createSaaSCouponAction,
  listSaaSCouponsAction,
  applyCouponToCheckoutAction,
  incrementCouponUsageAction,
} from "./presentation/saas-coupon.actions";
export type { CouponActionState } from "./presentation/saas-coupon.actions";
export { registerOrganizationSubscribers } from "./infrastructure/subscribers";

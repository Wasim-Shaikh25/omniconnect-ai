/**
 * Crm module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/crm`.
 * Owns Customer + Follower persistence. Subscribes to Meta events to upsert
 * customers and record followers, emitting `FirstTimeFollowerDetected`.
 */
export const MODULE_NAME = "crm" as const;

// Domain events
export {
  CustomerProfileUpdated,
  FirstTimeFollowerDetected,
  CrmInsightGenerated,
  CrmRecommendationGenerated,
} from "./domain/events";
export type {
  CustomerProfileUpdatedPayload,
  FirstTimeFollowerDetectedPayload,
  CrmInsight,
  CrmRecommendation,
  CrmInsightGeneratedPayload,
  CrmRecommendationGeneratedPayload,
} from "./domain/events";

// Application record types
export type {
  CustomerConsent,
  CustomerCouponRecord,
  CustomerCouponUsageRecord,
  CustomerLifecycleStage,
  CustomerMemory,
  CustomerProfile,
  CustomerRecord,
  FollowerRecord,
} from "./application/ports";

export type { CrmQueries } from "./application/queries";
export type { CrmCommands } from "./application/commands";
export type { DetectCrmInsights } from "./application/detect-insights";
export type {
  CustomerActivity,
  CustomerDetailView,
  CustomerDirectoryFilter,
  CustomerListView,
} from "./application/customer-directory";

// Commands + Queries (composed)
export { crmCommands } from "./infrastructure/container";
export { crmQueries, customerDirectory, detectCrmInsights } from "./infrastructure/container";

// Presentation
export {
  updateCustomerLifecycleAction,
  updateCustomerConsentAction,
} from "./presentation/actions";
export type { CustomerActionState } from "./presentation/actions";

/**
 * Coupons module — public barrel.
 *
 * The ONLY file other modules may import from `@/modules/coupons`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Personalized coupon generation and first-time follower
 * campaign orchestration.
 */
export const MODULE_NAME = "coupons" as const;

// Domain events
export {
  WelcomeCouponGenerated,
  WelcomeMessageSent,
} from "./domain/events";
export type {
  WelcomeCouponGeneratedPayload,
  WelcomeMessageSentPayload,
} from "./domain/events";

// Application schemas
export { updateCampaignSchema } from "./application/update-campaign";
export type { UpdateCampaignInput } from "./application/update-campaign";

// Composition root
export {
  couponsQueries,
  updateCampaign,
  welcomeFirstFollower,
} from "./infrastructure/container";

// Presentation
export {
  updateCampaignAction,
  simulateFirstTimeFollower,
} from "./presentation/actions";
export type { CouponsActionState } from "./presentation/actions";

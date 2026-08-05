/**
 * Attribution module — public barrel.
 *
 * Tracks revenue attribution from UTM/coupon checkout links and closes the loop
 * with order webhooks. Sends server-side purchase events to the Meta Conversions API.
 */
export const MODULE_NAME = "attribution" as const;

// Application types
export type {
  AttributionLink,
  CreateAttributionLinkInput,
  AttributionLinkRepository,
  CouponInfo,
  CouponLookup,
  ProjectConfig,
  ConversionEventSink,
} from "./application/ports";

// Use-cases
export {
  createAttributionLink,
  listAttributionLinks,
} from "./infrastructure/container";

// Presentation
export {
  createAttributionLinkAction,
  listAttributionLinksAction,
} from "./presentation/actions";
export type {
  CreateAttributionLinkState,
  ListAttributionLinksState,
} from "./presentation/actions";

// Bootstrap
export { registerAttributionSubscribers } from "./infrastructure/subscribers";

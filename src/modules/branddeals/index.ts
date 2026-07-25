/**
 * BrandDeals module — public barrel.
 */
export const MODULE_NAME = "branddeals" as const;

export type {
  BrandDealRecord,
  BrandDealStatus,
  CreateBrandDealInput,
  BrandDealQueries,
} from "./application/ports";

export { brandDealQueries, brandDealCommands, detectBrandDealInsights } from "./infrastructure/container";
export { createBrandDealAction } from "./presentation/actions";

export type {
  BrandDealCreatedPayload,
  BrandDealInsight,
  BrandDealRecommendation,
  BrandDealInsightGeneratedPayload,
  BrandDealRecommendationGeneratedPayload,
} from "./domain/events";
export type { DetectBrandDealInsights } from "./application/detect-insights";

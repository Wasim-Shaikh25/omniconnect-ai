/**
 * BrandDeals module — public barrel.
 */
export const MODULE_NAME = "branddeals" as const;

export type {
  BrandDealRecord,
  BrandDealStatus,
  CreateBrandDealInput,
} from "./application/ports";

export { brandDealQueries, brandDealCommands } from "./infrastructure/container";
export { createBrandDealAction } from "./presentation/actions";

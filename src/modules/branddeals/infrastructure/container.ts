import { makeListBrandDeals, makeCreateBrandDeal } from "../application/use-cases";
import { makeDetectBrandDealInsights } from "../application/detect-insights";
import { PrismaBrandDealRepository } from "./repository";

const brandDeals = new PrismaBrandDealRepository();

export const brandDealQueries = {
  listByStore: makeListBrandDeals({ brandDeals }),
};

export const detectBrandDealInsights = makeDetectBrandDealInsights({ brandDeals: brandDealQueries });

export const brandDealCommands = {
  createBrandDeal: makeCreateBrandDeal({ brandDeals }),
};

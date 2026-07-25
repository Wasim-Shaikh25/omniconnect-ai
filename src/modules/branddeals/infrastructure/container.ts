import { makeListBrandDeals, makeCreateBrandDeal } from "../application/use-cases";
import { PrismaBrandDealRepository } from "./repository";

const brandDeals = new PrismaBrandDealRepository();

export const brandDealQueries = {
  listByStore: makeListBrandDeals({ brandDeals }),
};

export const brandDealCommands = {
  createBrandDeal: makeCreateBrandDeal({ brandDeals }),
};

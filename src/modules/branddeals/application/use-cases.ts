import type {
  BrandDealCommands,
  BrandDealQueries,
  BrandDealRecord,
  BrandDealRepository,
  CreateBrandDealInput,
} from "./ports";

export function makeListBrandDeals(deps: {
  brandDeals: BrandDealRepository;
}): BrandDealQueries["listByStore"] {
  return (storeId, limit) => deps.brandDeals.listByStore(storeId, limit);
}

export function makeCreateBrandDeal(deps: {
  brandDeals: BrandDealRepository;
}): BrandDealCommands["create"] {
  return async (input: CreateBrandDealInput): Promise<BrandDealRecord> => {
    return deps.brandDeals.create({
      status: "LEAD",
      ...input,
    });
  };
}

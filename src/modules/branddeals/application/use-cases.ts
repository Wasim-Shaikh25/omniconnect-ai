import { eventBus } from "@/shared/events";
import { BrandDealCreated } from "../domain/events";
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
  return (projectId, limit) => deps.brandDeals.listByStore(projectId, limit);
}

export function makeCreateBrandDeal(deps: {
  brandDeals: BrandDealRepository;
}): BrandDealCommands["create"] {
  return async (input: CreateBrandDealInput): Promise<BrandDealRecord> => {
    const deal = await deps.brandDeals.create({
      status: "LEAD",
      ...input,
    });
    await eventBus.publish(
      new BrandDealCreated(deal.projectId, {
        projectId: deal.projectId,
        dealId: deal.id,
        brandName: deal.brandName,
        value: deal.value,
      }),
    );
    return deal;
  };
}

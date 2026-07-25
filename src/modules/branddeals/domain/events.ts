import { BaseDomainEvent } from "@/shared/kernel";

export interface BrandDealCreatedPayload {
  storeId: string;
  dealId: string;
  brandName: string;
  value: number | null;
}

export class BrandDealCreated extends BaseDomainEvent<BrandDealCreatedPayload> {
  readonly name = "BrandDealCreated";
}

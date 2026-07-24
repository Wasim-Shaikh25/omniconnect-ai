import { BaseDomainEvent } from "@/shared/kernel";

export interface OrganizationCreatedPayload {
  organizationId: string;
  ownerUserId: string;
  name: string;
}

export class OrganizationCreated extends BaseDomainEvent<OrganizationCreatedPayload> {
  readonly name = "OrganizationCreated";
}

export interface StoreCreatedPayload {
  storeId: string;
  organizationId: string;
  name: string;
  provider: string;
}

export class StoreCreated extends BaseDomainEvent<StoreCreatedPayload> {
  readonly name = "StoreCreated";
}

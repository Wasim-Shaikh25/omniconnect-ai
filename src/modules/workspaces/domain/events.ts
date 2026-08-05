import { BaseDomainEvent } from "@/shared/kernel";

export interface OrganizationCreatedPayload {
  userId: string;
  ownerUserId: string;
  name: string;
}

export class OrganizationCreated extends BaseDomainEvent<OrganizationCreatedPayload> {
  readonly name = "OrganizationCreated";
}

export interface StoreCreatedPayload {
  projectId: string;
  userId: string;
  name: string;
  provider: string;
}

export class StoreCreated extends BaseDomainEvent<StoreCreatedPayload> {
  readonly name = "StoreCreated";
}

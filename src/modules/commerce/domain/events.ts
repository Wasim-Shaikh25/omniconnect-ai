import { BaseDomainEvent } from "@/shared/kernel";

export interface CatalogSyncedPayload {
  storeId: string;
  syncId: string;
  externalCatalogId: string | null;
  productCount: number;
  status: "SUCCESS" | "FAILED";
}

export class CatalogSynced extends BaseDomainEvent<CatalogSyncedPayload> {
  readonly name = "CatalogSynced";
}

export interface ShoppableMediaCreatedPayload {
  storeId: string;
  mediaId: string;
  externalMediaId: string | null;
  productTags: Array<{ productId: string; name: string }>;
}

export class ShoppableMediaCreated extends BaseDomainEvent<ShoppableMediaCreatedPayload> {
  readonly name = "ShoppableMediaCreated";
}

import { BaseDomainEvent } from "@/shared/kernel";

export interface StoreConnectedPayload {
  storeId: string;
  provider: string;
  shopDomain: string | null;
}

export class StoreConnected extends BaseDomainEvent<StoreConnectedPayload> {
  readonly name = "StoreConnected";
}

export interface ProductInventorySnapshot {
  externalId: string;
  title: string;
  inventory: number | null;
}

export interface ProductsSyncedPayload {
  storeId: string;
  provider: string;
  count: number;
  products: ProductInventorySnapshot[];
}

export class ProductsSynced extends BaseDomainEvent<ProductsSyncedPayload> {
  readonly name = "ProductsSynced";
}

export interface CouponGeneratedPayload {
  storeId: string;
  couponId: string;
  code: string;
  discountPct: number;
  customerId: string | null;
}

export class CouponGenerated extends BaseDomainEvent<CouponGeneratedPayload> {
  readonly name = "CouponGenerated";
}

export interface CouponDisabledPayload {
  storeId: string;
  code: string;
}

export class CouponDisabled extends BaseDomainEvent<CouponDisabledPayload> {
  readonly name = "CouponDisabled";
}

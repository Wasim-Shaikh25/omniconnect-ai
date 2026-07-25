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

export interface CommerceInsight {
  organizationId: string;
  storeId: string;
  type: "RISK" | "OPPORTUNITY" | "ANOMALY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "DISMISSED" | "SNOOZED";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface CommerceRecommendation {
  organizationId: string;
  storeId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface CommerceInsightGeneratedPayload {
  organizationId: string;
  storeId: string;
  insight: CommerceInsight;
}

export class CommerceInsightGenerated extends BaseDomainEvent<CommerceInsightGeneratedPayload> {
  readonly name = "CommerceInsightGenerated";
}

export interface CommerceRecommendationGeneratedPayload {
  organizationId: string;
  storeId: string;
  recommendation: CommerceRecommendation;
}

export class CommerceRecommendationGenerated extends BaseDomainEvent<CommerceRecommendationGeneratedPayload> {
  readonly name = "CommerceRecommendationGenerated";
}

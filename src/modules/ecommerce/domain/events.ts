import { BaseDomainEvent } from "@/shared/kernel";
import type { ConnectorOrder } from "./connector";

export interface StoreConnectedPayload {
  projectId: string;
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
  projectId: string;
  provider: string;
  count: number;
  products: ProductInventorySnapshot[];
}

export class ProductsSynced extends BaseDomainEvent<ProductsSyncedPayload> {
  readonly name = "ProductsSynced";
}

export interface CouponGeneratedPayload {
  projectId: string;
  couponId: string;
  code: string;
  discountPct: number;
  customerId: string | null;
}

export class CouponGenerated extends BaseDomainEvent<CouponGeneratedPayload> {
  readonly name = "CouponGenerated";
}

export interface CouponDisabledPayload {
  projectId: string;
  code: string;
}

export class CouponDisabled extends BaseDomainEvent<CouponDisabledPayload> {
  readonly name = "CouponDisabled";
}

export interface CommerceInsight {
  userId: string;
  projectId: string;
  type: "RISK" | "OPPORTUNITY" | "ANOMALY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "DISMISSED" | "SNOOZED";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface CommerceRecommendation {
  userId: string;
  projectId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface CommerceInsightGeneratedPayload {
  userId: string;
  projectId: string;
  insight: CommerceInsight;
}

export class CommerceInsightGenerated extends BaseDomainEvent<CommerceInsightGeneratedPayload> {
  readonly name = "CommerceInsightGenerated";
}

export interface CommerceRecommendationGeneratedPayload {
  userId: string;
  projectId: string;
  recommendation: CommerceRecommendation;
}

export class CommerceRecommendationGenerated extends BaseDomainEvent<CommerceRecommendationGeneratedPayload> {
  readonly name = "CommerceRecommendationGenerated";
}

export interface AbandonedCartDetectedPayload {
  cartId: string;
  projectId: string;
  cartToken: string;
  email: string | null;
  lineItemTitles: string[];
  totalPrice: number | null;
  currency: string | null;
  recoveredUrl: string | null;
  detectedAt: Date;
}

export class AbandonedCartDetected extends BaseDomainEvent<AbandonedCartDetectedPayload> {
  readonly name = "AbandonedCartDetected";
}

export interface OrderSyncedPayload {
  projectId: string;
  order: ConnectorOrder;
}

export class OrderSynced extends BaseDomainEvent<OrderSyncedPayload> {
  readonly name = "OrderSynced";
}

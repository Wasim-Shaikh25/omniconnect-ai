import type { ConnectorOrder } from "@/modules/ecommerce";

export interface AttributionLink {
  id: string;
  projectId: string;
  couponId: string | null;
  fullUrl: string;
  shortCode: string;
  utmSource: string;
  utmMedium: string | null;
  utmCampaign: string | null;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttributionLinkInput {
  projectId: string;
  couponId?: string | null;
  fullUrl: string;
  shortCode: string;
  utmSource: string;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface AttributionLinkRepository {
  create(input: CreateAttributionLinkInput): Promise<AttributionLink>;
  findByShortCode(shortCode: string): Promise<AttributionLink | null>;
  findByCoupon(couponId: string): Promise<AttributionLink | null>;
  listByProject(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<AttributionLink[]>;
  incrementConversion(id: string, revenue: number): Promise<AttributionLink | null>;
  incrementClick(id: string): Promise<AttributionLink | null>;
}

export interface CouponInfo {
  id: string;
  code: string;
}

export interface CouponLookup {
  findById(projectId: string, id: string): Promise<CouponInfo | null>;
  findByCode(projectId: string, code: string): Promise<CouponInfo | null>;
  incrementRedemption(projectId: string, code: string, revenue: number): Promise<void>;
}

export interface ProjectConfig {
  getEcommerceBaseUrl(projectId: string): Promise<{ baseUrl: string | null; couponUrlPattern: string | null }>;
  getMetaPixelId(projectId: string): Promise<string | null>;
}

export interface ConversionEventSink {
  sendPurchaseEvent(projectId: string, order: ConnectorOrder): Promise<void>;
}

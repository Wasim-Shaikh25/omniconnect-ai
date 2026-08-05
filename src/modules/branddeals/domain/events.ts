import { BaseDomainEvent } from "@/shared/kernel";

export interface BrandDealCreatedPayload {
  projectId: string;
  dealId: string;
  brandName: string;
  value: number | null;
}

export class BrandDealCreated extends BaseDomainEvent<BrandDealCreatedPayload> {
  readonly name = "BrandDealCreated";
}

export interface BrandDealInsight {
  userId: string;
  projectId: string;
  dealId: string;
  type: "RISK" | "OPPORTUNITY" | "ANOMALY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "DISMISSED" | "SNOOZED";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface BrandDealRecommendation {
  userId: string;
  projectId: string;
  dealId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface BrandDealInsightGeneratedPayload {
  userId: string;
  projectId: string;
  dealId: string;
  insight: BrandDealInsight;
}

export class BrandDealInsightGenerated extends BaseDomainEvent<BrandDealInsightGeneratedPayload> {
  readonly name = "BrandDealInsightGenerated";
}

export interface BrandDealRecommendationGeneratedPayload {
  userId: string;
  projectId: string;
  dealId: string;
  recommendation: BrandDealRecommendation;
}

export class BrandDealRecommendationGenerated extends BaseDomainEvent<BrandDealRecommendationGeneratedPayload> {
  readonly name = "BrandDealRecommendationGenerated";
}

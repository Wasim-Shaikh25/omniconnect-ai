import { BaseDomainEvent } from "@/shared/kernel";

export interface FirstTimeFollowerDetectedPayload {
  projectId: string;
  customerId: string;
  followerId: string;
  channel: string;
  externalUserId: string;
  username: string | null;
}

/**
 * Emitted the first time a follower is recorded for a store. The first-time
 * follower campaign (TASK-080) subscribes to distribute a welcome coupon.
 */
export class FirstTimeFollowerDetected extends BaseDomainEvent<FirstTimeFollowerDetectedPayload> {
  readonly name = "FirstTimeFollowerDetected";
}

export interface CustomerProfileUpdatedPayload {
  projectId: string;
  customerId: string;
  tags: string[];
  interests: string[];
}

/**
 * Emitted whenever a customer's tags or interests change. The AI assistant
 * and analytics modules may subscribe to refresh personalization context.
 */
export class CustomerProfileUpdated extends BaseDomainEvent<CustomerProfileUpdatedPayload> {
  readonly name = "CustomerProfileUpdated";
}

export interface CrmInsight {
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

export interface CrmRecommendation {
  userId: string;
  projectId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface CrmInsightGeneratedPayload {
  userId: string;
  projectId: string;
  insight: CrmInsight;
}

export class CrmInsightGenerated extends BaseDomainEvent<CrmInsightGeneratedPayload> {
  readonly name = "CrmInsightGenerated";
}

export interface CrmRecommendationGeneratedPayload {
  userId: string;
  projectId: string;
  recommendation: CrmRecommendation;
}

export class CrmRecommendationGenerated extends BaseDomainEvent<CrmRecommendationGeneratedPayload> {
  readonly name = "CrmRecommendationGenerated";
}

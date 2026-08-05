import { BaseDomainEvent } from "@/shared/kernel";

export interface WelcomeCouponGeneratedPayload {
  projectId: string;
  followerId: string;
  customerId: string;
  externalUserId: string;
  couponId: string;
  code: string;
  discountPct: number;
  expiresAt: Date | null;
}

export class WelcomeCouponGenerated extends BaseDomainEvent<WelcomeCouponGeneratedPayload> {
  readonly name = "WelcomeCouponGenerated";
}

export interface WelcomeMessageSentPayload {
  projectId: string;
  followerId: string;
  customerId: string;
  externalUserId: string;
  couponId: string;
  messageText: string;
}

export class WelcomeMessageSent extends BaseDomainEvent<WelcomeMessageSentPayload> {
  readonly name = "WelcomeMessageSent";
}

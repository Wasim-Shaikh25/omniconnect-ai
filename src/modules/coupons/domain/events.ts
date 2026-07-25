import { BaseDomainEvent } from "@/shared/kernel";

export interface WelcomeCouponGeneratedPayload {
  storeId: string;
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
  storeId: string;
  followerId: string;
  customerId: string;
  externalUserId: string;
  couponId: string;
  messageText: string;
}

export class WelcomeMessageSent extends BaseDomainEvent<WelcomeMessageSentPayload> {
  readonly name = "WelcomeMessageSent";
}

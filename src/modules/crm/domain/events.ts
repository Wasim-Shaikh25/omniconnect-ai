import { BaseDomainEvent } from "@/shared/kernel";

export interface FirstTimeFollowerDetectedPayload {
  storeId: string;
  customerId: string;
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
  storeId: string;
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

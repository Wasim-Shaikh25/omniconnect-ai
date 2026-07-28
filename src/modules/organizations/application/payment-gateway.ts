import { Plan } from "../domain/plan";

export interface CheckoutSessionInput {
  organizationId: string;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
  promotionCodeId?: string;
  couponCode?: string;
}

export interface CheckoutSessionResult {
  url: string | null;
}

export interface PaymentGateway {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): unknown;
}

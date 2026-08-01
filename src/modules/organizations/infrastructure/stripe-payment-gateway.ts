import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { Plan } from "../domain/plan";
import {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentGateway,
} from "../application/payment-gateway";

const planToPriceId: Record<Plan, string | undefined> = {
  [Plan.FREE]: undefined,
  [Plan.STARTER]: env.STRIPE_PRICE_STARTER,
  [Plan.PRO]: env.STRIPE_PRICE_PRO,
};

export class StripePaymentGateway implements PaymentGateway {
  private client: Stripe;

  constructor() {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    this.client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-09-30.acacia",
      typescript: true,
    });
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const priceId = planToPriceId[input.plan];
    if (!priceId) {
      throw new Error(`No Stripe price configured for plan ${input.plan}`);
    }

    const sessionInput: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.organizationId,
      // Top-level metadata is returned on the checkout session and subsequent
      // webhook events so fulfillment always has the canonical plan/org/coupon.
      metadata: {
        organizationId: input.organizationId,
        plan: input.plan,
        couponCode: input.couponCode ?? "",
      },
      subscription_data: {
        metadata: { organizationId: input.organizationId, plan: input.plan },
      },
    };

    if (input.promotionCodeId) {
      sessionInput.discounts = [{ promotion_code: input.promotionCodeId }];
    }

    const session = await this.client.checkout.sessions.create(sessionInput);

    return { url: session.url ?? null };
  }

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.client.webhooks.constructEvent(payload, signature, secret);
  }
}

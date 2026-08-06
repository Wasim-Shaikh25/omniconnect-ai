import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { Plan } from "../domain/plan";
import {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentGateway,
  PortalSessionInput,
  PortalSessionResult,
  InvoiceRecord,
  RefundInput,
  RefundResult,
} from "../application/payment-gateway";

const planToPriceId: Record<Plan, string | undefined> = {
  [Plan.FREE]: undefined,
  [Plan.PRO]: env.STRIPE_PRICE_STARTER,
  [Plan.BUSINESS]: env.STRIPE_PRICE_PRO,
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
      client_reference_id: input.userId,
      // Top-level metadata is returned on the checkout session and subsequent
      // webhook events so fulfillment always has the canonical plan/org/coupon.
      metadata: {
        userId: input.userId,
        plan: input.plan,
        couponCode: input.couponCode ?? "",
      },
      subscription_data: {
        metadata: { userId: input.userId, plan: input.plan },
      },
    };

    if (input.promotionCodeId) {
      sessionInput.discounts = [{ promotion_code: input.promotionCodeId }];
    }

    const session = await this.client.checkout.sessions.create(sessionInput);

    return { url: session.url ?? null };
  }

  async createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult> {
    const session = await this.client.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url ?? null };
  }

  async listInvoices(customerId: string): Promise<InvoiceRecord[]> {
    const invoices = await this.client.invoices.list({
      customer: customerId,
      limit: 50,
      status: "paid",
    });
    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number ?? null,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status ?? "unknown",
      createdAt: invoice.created,
      pdfUrl: invoice.invoice_pdf ?? null,
      periodStart: invoice.period_start ?? null,
      periodEnd: invoice.period_end ?? null,
      paymentIntentId: typeof invoice.payment_intent === "string" ? invoice.payment_intent : null,
    }));
  }

  async createRefund(input: RefundInput): Promise<RefundResult> {
    const refund = await this.client.refunds.create({
      payment_intent: input.paymentIntentId,
      amount: input.amount,
      reason: input.reason ? "requested_by_customer" : undefined,
      metadata: { reason: input.reason ?? "" },
    });
    return {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status ?? "pending",
    };
  }

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.client.webhooks.constructEvent(payload, signature, secret);
  }
}

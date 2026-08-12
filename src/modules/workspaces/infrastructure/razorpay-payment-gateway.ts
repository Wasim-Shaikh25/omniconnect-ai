import Razorpay from "razorpay";
import { env } from "@/shared/config/env";
import { Plan } from "../domain/plan";
import {
  CheckoutSessionInput,
  CheckoutSessionResult,
  InvoiceRecord,
  PaymentGateway,
  PortalSessionInput,
  PortalSessionResult,
  RefundInput,
  RefundResult,
} from "../application/payment-gateway";

const planToRazorpayPlanId: Record<Plan, string | undefined> = {
  [Plan.FREE]: undefined,
  [Plan.PRO]: env.RAZORPAY_PLAN_PRO,
  [Plan.BUSINESS]: env.RAZORPAY_PLAN_BUSINESS,
};

const RAZORPAY_DASHBOARD_URL = "https://dashboard.razorpay.com";

export class RazorpayPaymentGateway implements PaymentGateway {
  private client: Razorpay;

  constructor() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured");
    }
    this.client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const planId = planToRazorpayPlanId[input.plan];
    if (!planId) {
      throw new Error(`No Razorpay plan configured for plan ${input.plan}`);
    }

    const subscription = await this.client.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: input.userId,
        plan: input.plan,
      },
    });

    return { url: subscription.short_url ?? null };
  }

  async createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult> {
    // Razorpay does not provide a self-service customer portal.
    // Link the user to the Razorpay dashboard so they can manage subscriptions there.
    return { url: `${RAZORPAY_DASHBOARD_URL}/customers/${input.customerId}` };
  }

  async listInvoices(customerId: string): Promise<InvoiceRecord[]> {
    const response = await this.client.invoices.all({
      customer_id: customerId,
      count: 50,
    });

    const items = Array.isArray(response.items) ? response.items : [];
    return items
      .filter((invoice) => invoice.status === "paid")
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.invoice_number ?? invoice.receipt ?? null,
        amount: typeof invoice.amount === "string" ? Number(invoice.amount) : (invoice.amount ?? 0),
        currency: invoice.currency ?? "inr",
        status: invoice.status ?? "unknown",
        createdAt: invoice.created_at ?? 0,
        pdfUrl: null,
        periodStart: invoice.billing_start ?? null,
        periodEnd: invoice.billing_end ?? null,
        paymentIntentId: invoice.payment_id ?? null,
      }));
  }

  async createRefund(input: RefundInput): Promise<RefundResult> {
    const refund = await this.client.payments.refund(input.paymentIntentId, {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      notes: { reason: input.reason ?? "" },
    });

    return {
      refundId: refund.id,
      amount: refund.amount ?? 0,
      status: refund.status ?? "pending",
    };
  }

  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): unknown {
    const body = typeof payload === "string" ? payload : payload.toString();
    const isValid = Razorpay.validateWebhookSignature(body, signature, secret);
    if (!isValid) {
      throw new Error("Invalid Razorpay signature");
    }
    return JSON.parse(body);
  }
}

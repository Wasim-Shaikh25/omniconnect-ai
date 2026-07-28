import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/observability";
import { Plan, isPlan } from "../domain/plan";
import { OrganizationRepository } from "./ports";
import { SaaSCouponRepository } from "./saas-coupon";
import { CheckoutSessionInput, PaymentGateway } from "./payment-gateway";

export class BillingSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingSignatureError";
  }
}

export class BillingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingConfigurationError";
  }
}

export interface BillingService {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string | null }>;
  fulfillCheckout(payload: string | Buffer, signature: string): Promise<void>;
}

export function makeBillingService(deps: {
  organizations: OrganizationRepository;
  paymentGateway: PaymentGateway;
  coupons: SaaSCouponRepository;
}): BillingService {
  return {
    async createCheckoutSession(input: CheckoutSessionInput) {
      const org = await deps.organizations.findById(input.organizationId);
      if (!org) throw new Error("Organization not found");
      return deps.paymentGateway.createCheckoutSession(input);
    },

    async fulfillCheckout(payload, signature) {
      const secret = env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        throw new BillingConfigurationError("STRIPE_WEBHOOK_SECRET is not configured");
      }

      let rawEvent: unknown;
      try {
        rawEvent = deps.paymentGateway.constructWebhookEvent(payload, signature, secret);
      } catch (err) {
        if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
          throw new BillingSignatureError("Invalid Stripe signature");
        }
        throw err;
      }
      const event = rawEvent as Stripe.Event;

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          // Do not fulfill sessions that were not successfully paid.
          if (session.payment_status !== "paid") {
            logger.info("stripe.checkout.unpaid", {
              sessionId: session.id,
              status: session.status,
              paymentStatus: session.payment_status,
            });
            return;
          }

          const metadata = session.metadata ?? {};
          const organizationId = metadata.organizationId ?? session.client_reference_id;
          const plan = metadata.plan;
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : undefined;

          if (!organizationId || !plan || !isPlan(plan)) {
            logger.error("stripe.checkout.missingMetadata", {
              sessionId: session.id,
              organizationId,
              plan,
            });
            return;
          }

          await deps.organizations.updatePlan(organizationId, {
            plan,
            subscriptionId,
            subscriptionStatus: "active",
          });

          const couponCode = metadata.couponCode;
          if (couponCode) {
            await incrementCouponUsage(deps.coupons, couponCode);
          }

          logger.info("stripe.checkout.fulfilled", { organizationId, plan, subscriptionId });
          return;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const metadata = subscription.metadata ?? {};
          const organizationId = metadata.organizationId;
          if (!organizationId) {
            logger.error("stripe.subscription.missingMetadata", { subscriptionId: subscription.id });
            return;
          }
          await deps.organizations.updatePlan(organizationId, {
            plan: Plan.FREE,
            subscriptionId: subscription.id,
            subscriptionStatus: "canceled",
          });
          logger.info("stripe.subscription.canceled", { organizationId, subscriptionId: subscription.id });
          return;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId =
            typeof invoice.subscription === "string" ? invoice.subscription : undefined;
          if (!subscriptionId) {
            logger.error("stripe.invoice.missingSubscription", { invoiceId: invoice.id });
            return;
          }
          // Mark the organization as past_due while preserving the current plan.
          const org = await findOrganizationBySubscriptionId(deps.organizations, subscriptionId);
          if (org) {
            await deps.organizations.updatePlan(org.id, {
              plan: org.plan,
              subscriptionId,
              subscriptionStatus: "past_due",
            });
            logger.info("stripe.invoice.pastDue", { organizationId: org.id, subscriptionId });
          }
          return;
        }

        default:
          logger.info("stripe.webhook.unhandled", { type: event.type });
          return;
      }
    },
  };
}

async function incrementCouponUsage(
  coupons: SaaSCouponRepository,
  code: string,
): Promise<void> {
  try {
    const coupon = await coupons.findByCode(code);
    if (!coupon || !coupon.isActive) return;
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return;
    const incremented = await coupons.incrementUsage(coupon.id, coupon.maxUses);
    if (!incremented) {
      logger.warn("saasCoupon.usageLimitReached", { code, couponId: coupon.id });
      return;
    }
    logger.info("saasCoupon.usageIncremented", { code, couponId: coupon.id });
  } catch (error) {
    logger.error("saasCoupon.incrementUsageFailed", {
      code,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

async function findOrganizationBySubscriptionId(
  organizations: OrganizationRepository,
  subscriptionId: string,
): Promise<{ id: string; plan: Plan } | null> {
  const org = await organizations.findBySubscriptionId(subscriptionId);
  return org ? { id: org.id, plan: org.plan } : null;
}

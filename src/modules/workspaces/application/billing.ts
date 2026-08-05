import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/observability";
import type { ProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
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

/** Subscription statuses that keep the current paid plan (Q3: past_due retains plan). */
const RETAINED_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

export function makeBillingService(deps: {
  organizations: OrganizationRepository;
  paymentGateway: PaymentGateway;
  coupons: SaaSCouponRepository;
  processedEvents: ProcessedEventsRepository;
}): BillingService {
  return {
    async createCheckoutSession(input: CheckoutSessionInput) {
      const org = await deps.organizations.findById(input.userId);
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

      try {
        await deps.processedEvents.runInTransaction(async (tx) => {
          // Stripe delivers at least once and retries for 3 days. Record first inside
          // the transaction; a unique-constraint violation aborts the whole transaction
          // and is caught below as a duplicate.
          const recorded = await deps.processedEvents.record(
            {
              id: event.id,
              provider: "stripe",
              type: event.type,
            },
            tx,
          );
          if (!recorded.recorded) {
            // This branch is reachable when the repository does not throw on duplicates
            // (e.g. in-memory fakes or a non-transactional caller).
            return;
          }

          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.payment_status !== "paid") {
                logger.info("stripe.checkout.unpaid", {
                  sessionId: session.id,
                  status: session.status,
                  paymentStatus: session.payment_status,
                });
                return;
              }

              const metadata = session.metadata ?? {};
              const userId = metadata.userId ?? session.client_reference_id;
              const plan = metadata.plan;
              const subscriptionId =
                typeof session.subscription === "string" ? session.subscription : undefined;

              if (!userId || !plan || !isPlan(plan)) {
                logger.error("stripe.checkout.missingMetadata", {
                  sessionId: session.id,
                  userId,
                  plan,
                });
                return;
              }

              await deps.organizations.updatePlan(
                userId,
                {
                  plan,
                  subscriptionId,
                  subscriptionStatus: "active",
                },
                tx,
              );

              const couponCode = metadata.couponCode;
              if (couponCode) {
                await incrementCouponUsage(deps.coupons, couponCode, tx);
              }

              logger.info("stripe.checkout.fulfilled", {
                userId,
                plan,
                subscriptionId,
              });
              return;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const subscription = event.data.object as Stripe.Subscription;
              const metadata = subscription.metadata ?? {};
              const userId = metadata.userId;
              if (!userId) {
                logger.error("stripe.subscription.missingMetadata", {
                  subscriptionId: subscription.id,
                });
                return;
              }

              const priceId = subscription.items.data[0]?.price.id;
              const pricePlan = planFromPriceId(priceId);
              const existingOrg = await findOrganizationBySubscriptionId(
                deps.organizations,
                subscription.id,
                tx,
              );

              // An unknown price must not silently downgrade. Keep the current plan
              // when the price is not in the catalog.
              const basePlan = pricePlan ?? existingOrg?.plan ?? Plan.FREE;
              const entitledPlan = RETAINED_STATUSES.has(subscription.status)
                ? basePlan
                : Plan.FREE;

              await deps.organizations.updatePlan(
                userId,
                {
                  plan: entitledPlan,
                  subscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                },
                tx,
              );
              logger.info("stripe.subscription.synced", {
                userId,
                plan: entitledPlan,
                status: subscription.status,
                subscriptionId: subscription.id,
              });
              return;
            }

            case "invoice.paid":
            case "invoice.payment_succeeded": {
              // Stripe dunning recovered the payment. Clear past_due back to active
              // while preserving the plan the organization already had.
              const invoice = event.data.object as Stripe.Invoice;
              const subscriptionId = resolveSubscriptionId(invoice);
              if (!subscriptionId) {
                logger.error("stripe.invoice.missingSubscription", { invoiceId: invoice.id });
                return;
              }
              const org = await findOrganizationBySubscriptionId(
                deps.organizations,
                subscriptionId,
                tx,
              );
              if (!org) return;
              await deps.organizations.updatePlan(
                org.id,
                {
                  plan: org.plan,
                  subscriptionId,
                  subscriptionStatus: "active",
                },
                tx,
              );
              logger.info("stripe.invoice.paymentSucceeded", {
                userId: org.id,
                subscriptionId,
              });
              return;
            }

            case "customer.subscription.deleted": {
              const subscription = event.data.object as Stripe.Subscription;
              const metadata = subscription.metadata ?? {};
              const userId = metadata.userId;
              if (!userId) {
                logger.error("stripe.subscription.missingMetadata", {
                  subscriptionId: subscription.id,
                });
                return;
              }
              await deps.organizations.updatePlan(
                userId,
                {
                  plan: Plan.FREE,
                  subscriptionId: subscription.id,
                  subscriptionStatus: "canceled",
                },
                tx,
              );
              logger.info("stripe.subscription.canceled", {
                userId,
                subscriptionId: subscription.id,
              });
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
              const org = await findOrganizationBySubscriptionId(
                deps.organizations,
                subscriptionId,
                tx,
              );
              if (org) {
                await deps.organizations.updatePlan(
                  org.id,
                  {
                    plan: org.plan,
                    subscriptionId,
                    subscriptionStatus: "past_due",
                  },
                  tx,
                );
                logger.info("stripe.invoice.pastDue", {
                  userId: org.id,
                  subscriptionId,
                });
              }
              return;
            }

            default:
              logger.info("stripe.webhook.unhandled", { type: event.type });
              return;
          }
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          logger.info("stripe.webhook.duplicate", { eventId: event.id, type: event.type });
          return;
        }
        throw error;
      }
    },
  };
}

function planFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return Plan.BUSINESS;
  if (priceId === env.STRIPE_PRICE_STARTER) return Plan.PRO;
  return null;
}

function resolveSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  if (typeof invoice.subscription === "string") return invoice.subscription;
  const parent = (invoice as unknown as { parent?: { subscription_details?: { subscription?: unknown } } }).parent;
  const sub = parent?.subscription_details?.subscription;
  return typeof sub === "string" ? sub : undefined;
}

async function incrementCouponUsage(
  coupons: SaaSCouponRepository,
  code: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  try {
    const coupon = await coupons.findByCode(code, tx);
    if (!coupon || !coupon.isActive) return;
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return;
    const incremented = await coupons.incrementUsage(coupon.id, coupon.maxUses, tx);
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
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; plan: Plan } | null> {
  const org = await organizations.findBySubscriptionId(subscriptionId, tx);
  return org ? { id: org.id, plan: org.plan } : null;
}

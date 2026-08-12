import { Prisma } from "@prisma/client";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/observability";
import type { ProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
import { Plan } from "../domain/plan";
import { OrganizationRepository } from "./ports";
import { CheckoutSessionInput, PaymentGateway, PortalSessionInput, PortalSessionResult, InvoiceRecord, RefundInput, RefundResult } from "./payment-gateway";

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
  createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult>;
  listInvoices(customerId: string): Promise<InvoiceRecord[]>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
  fulfillCheckout(payload: string | Buffer, signature: string, eventId?: string): Promise<void>;
}

type RazorpayEventName =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.pending"
  | "subscription.halted"
  | "subscription.cancelled"
  | "subscription.completed"
  | "payment.failed";

interface RazorpayWebhookEvent {
  entity: "event";
  event: RazorpayEventName;
  payload: {
    subscription?: RazorpaySubscription;
    payment?: RazorpayPayment;
    [key: string]: unknown;
  };
  id?: string;
}

interface RazorpaySubscription {
  id: string;
  status: string;
  plan_id: string;
  customer_id: string | null;
  notes?: Record<string, string>;
  remaining_count: string | number;
  current_start?: number | null;
  current_end?: number | null;
}

interface RazorpayPayment {
  id: string;
  status: string;
  invoice_id: string | null;
  subscription_id?: string | null;
}


export function makeBillingService(deps: {
  organizations: OrganizationRepository;
  paymentGateway: PaymentGateway;
  processedEvents: ProcessedEventsRepository;
}): BillingService {
  return {
    async createCheckoutSession(input: CheckoutSessionInput) {
      const org = await deps.organizations.findById(input.userId);
      if (!org) throw new Error("Organization not found");
      return deps.paymentGateway.createCheckoutSession(input);
    },

    async createPortalSession(input: PortalSessionInput) {
      return deps.paymentGateway.createPortalSession(input);
    },

    async listInvoices(customerId: string) {
      return deps.paymentGateway.listInvoices(customerId);
    },

    async refundPayment(input: RefundInput) {
      return deps.paymentGateway.createRefund(input);
    },

    async fulfillCheckout(payload, signature, eventId) {
      const secret = env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) {
        throw new BillingConfigurationError("RAZORPAY_WEBHOOK_SECRET is not configured");
      }

      let rawEvent: unknown;
      try {
        rawEvent = deps.paymentGateway.constructWebhookEvent(payload, signature, secret);
      } catch {
        throw new BillingSignatureError("Invalid Razorpay signature");
      }

      const event = rawEvent as RazorpayWebhookEvent;
      const eventType = event.event;
      const effectiveEventId = eventId ?? event.id ?? computeEventId(payload);

      try {
        await deps.processedEvents.runInTransaction(async (tx) => {
          const recorded = await deps.processedEvents.record(
            {
              id: effectiveEventId,
              provider: "razorpay",
              type: eventType,
            },
            tx,
          );
          if (!recorded.recorded) {
            return;
          }

          const subscription = event.payload.subscription;
          const payment = event.payload.payment;

          if (!subscription) {
            if (eventType === "payment.failed" && payment?.subscription_id) {
              const org = await findOrganizationBySubscriptionId(
                deps.organizations,
                payment.subscription_id,
                tx,
              );
              if (!org) return;
              await deps.organizations.updatePlan(
                org.id,
                {
                  plan: org.plan,
                  subscriptionId: payment.subscription_id,
                  subscriptionStatus: "past_due",
                },
                tx,
              );
              logger.info("razorpay.payment.failed", {
                userId: org.id,
                subscriptionId: payment.subscription_id,
              });
              return;
            }
            logger.warn("razorpay.webhook.missingSubscription", { type: eventType });
            return;
          }

          const notes = subscription.notes ?? {};
          const userId = notes.userId;
          const subscriptionPlan = planFromPlanId(subscription.plan_id);

          switch (eventType) {
            case "subscription.activated": {
              if (!userId || !subscriptionPlan) {
                logger.error("razorpay.activation.missingData", {
                  subscriptionId: subscription.id,
                  userId,
                  planId: subscription.plan_id,
                });
                return;
              }

              await deps.organizations.updatePlan(
                userId,
                {
                  plan: subscriptionPlan,
                  subscriptionId: subscription.id,
                  subscriptionStatus: "active",
                  paymentCustomerId: subscription.customer_id ?? undefined,
                },
                tx,
              );

              logger.info("razorpay.subscription.activated", {
                userId,
                plan: subscriptionPlan,
                subscriptionId: subscription.id,
              });
              return;
            }

            case "subscription.charged": {
              const org = await findOrganizationBySubscriptionId(
                deps.organizations,
                subscription.id,
                tx,
              );
              if (!org) {
                logger.error("razorpay.charged.orgNotFound", {
                  subscriptionId: subscription.id,
                });
                return;
              }
              await deps.organizations.updatePlan(
                org.id,
                {
                  plan: org.plan,
                  subscriptionId: subscription.id,
                  subscriptionStatus: "active",
                  paymentCustomerId: subscription.customer_id ?? undefined,
                },
                tx,
              );
              logger.info("razorpay.subscription.charged", {
                userId: org.id,
                subscriptionId: subscription.id,
              });
              return;
            }

            case "subscription.pending":
            case "subscription.halted": {
              const org = await findOrganizationBySubscriptionId(
                deps.organizations,
                subscription.id,
                tx,
              );
              if (!org) return;
              await deps.organizations.updatePlan(
                org.id,
                {
                  plan: org.plan,
                  subscriptionId: subscription.id,
                  subscriptionStatus: "past_due",
                  paymentCustomerId: subscription.customer_id ?? undefined,
                },
                tx,
              );
              logger.info("razorpay.subscription.pastDue", {
                userId: org.id,
                subscriptionId: subscription.id,
                type: eventType,
              });
              return;
            }

            case "subscription.cancelled":
            case "subscription.completed": {
              const org = await findOrganizationBySubscriptionId(
                deps.organizations,
                subscription.id,
                tx,
              );
              if (!org) return;
              const status = eventType === "subscription.completed" ? "completed" : "canceled";
              await deps.organizations.updatePlan(
                org.id,
                {
                  plan: Plan.FREE,
                  subscriptionId: subscription.id,
                  subscriptionStatus: status,
                  paymentCustomerId: subscription.customer_id ?? undefined,
                },
                tx,
              );
              logger.info("razorpay.subscription.ended", {
                userId: org.id,
                subscriptionId: subscription.id,
                type: eventType,
              });
              return;
            }

            default:
              logger.info("razorpay.webhook.unhandled", { type: eventType });
              return;
          }
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          logger.info("razorpay.webhook.duplicate", { eventId, type: eventType });
          return;
        }
        throw error;
      }
    },
  };
}

function planFromPlanId(planId: string | undefined): Plan | null {
  if (!planId) return null;
  if (planId === env.RAZORPAY_PLAN_BUSINESS) return Plan.BUSINESS;
  if (planId === env.RAZORPAY_PLAN_PRO) return Plan.PRO;
  return null;
}

function computeEventId(payload: string | Buffer): string {
  // Fallback when neither an event id header nor a Razorpay event id is present.
  // A stable string representation is sufficient for test fixtures; production callers
  // must pass the `x-razorpay-event-id` header or a SHA-256 of the raw body.
  const body = typeof payload === "string" ? payload : payload.toString("utf8");
  return `razorpay-${Buffer.from(body).toString("base64").slice(0, 64)}`;
}

async function findOrganizationBySubscriptionId(
  organizations: OrganizationRepository,
  subscriptionId: string,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; plan: Plan } | null> {
  const org = await organizations.findBySubscriptionId(subscriptionId, tx);
  return org ? { id: org.id, plan: org.plan } : null;
}

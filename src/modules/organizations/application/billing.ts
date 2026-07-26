import { env } from "@/shared/config/env";
import { Plan } from "../domain/plan";
import { OrganizationRepository } from "./ports";
import { PaymentGateway } from "./payment-gateway";

export interface BillingService {
  createCheckoutSession(
    organizationId: string,
    plan: Plan,
  ): Promise<{ url: string | null }>;
  fulfillCheckout(payload: string | Buffer, signature: string): Promise<void>;
}

export function makeBillingService(deps: {
  organizations: OrganizationRepository;
  paymentGateway: PaymentGateway;
}): BillingService {
  return {
    async createCheckoutSession(organizationId: string, plan: Plan) {
      const org = await deps.organizations.findById(organizationId);
      if (!org) throw new Error("Organization not found");
      const appUrl = env.APP_URL ?? "http://localhost:3000";
      return deps.paymentGateway.createCheckoutSession({
        organizationId,
        plan,
        successUrl: `${appUrl}/settings/billing?success=1`,
        cancelUrl: `${appUrl}/settings/billing?canceled=1`,
      });
    },

    async fulfillCheckout(payload, signature) {
      const secret = env.STRIPE_WEBHOOK_SECRET;
      if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

      const event = deps.paymentGateway.constructWebhookEvent(payload, signature, secret);
      const stripeEvent = event as { type?: unknown; data?: { object?: unknown } };
      if (stripeEvent.type !== "checkout.session.completed") return;

      const session = stripeEvent.data?.object as {
        client_reference_id?: string;
        metadata?: { plan?: string };
        subscription?: string;
      } | undefined;
      const organizationId = session?.client_reference_id;
      const plan = session?.metadata?.plan;
      const subscriptionId =
        typeof session?.subscription === "string" ? session.subscription : undefined;

      if (!organizationId || !plan) return;
      if (!isPlan(plan)) return;

      await deps.organizations.updatePlan(organizationId, {
        plan,
        subscriptionId,
        subscriptionStatus: "active",
      });
    },
  };
}

function isPlan(value: string): value is Plan {
  return value === Plan.FREE || value === Plan.STARTER || value === Plan.PRO;
}

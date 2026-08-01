import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/database";
import { Plan } from "@/modules/organizations/domain/plan";
import { logger } from "@/shared/observability";

const RETAINED_STATUSES = ["active", "trialing", "past_due"];

function planFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return Plan.PRO;
  if (priceId === env.STRIPE_PRICE_STARTER) return Plan.STARTER;
  return null;
}

async function main() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-09-30.acacia",
  });

  const orgs = await prisma.organization.findMany({
    where: { subscriptionStatus: "past_due" },
    select: { id: true, plan: true, subscriptionId: true },
  });

  for (const org of orgs) {
    if (!org.subscriptionId) continue;
    try {
      const subscription = await stripe.subscriptions.retrieve(org.subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      const pricePlan = planFromPriceId(priceId);
      const basePlan = pricePlan ?? (org.plan as Plan);
      const entitledPlan = RETAINED_STATUSES.includes(subscription.status)
        ? basePlan
        : Plan.FREE;

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          plan: entitledPlan,
          subscriptionStatus: subscription.status,
        },
      });

      logger.info("backfill.pastDue.synced", {
        organizationId: org.id,
        subscriptionId: org.subscriptionId,
        plan: entitledPlan,
        status: subscription.status,
      });
    } catch (error) {
      logger.error("backfill.pastDue.failed", {
        organizationId: org.id,
        subscriptionId: org.subscriptionId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  logger.error("backfill.pastDue.fatal", { error: error instanceof Error ? error.message : "unknown" });
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

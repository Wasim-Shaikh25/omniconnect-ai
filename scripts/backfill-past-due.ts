import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { env } from "@/shared/config";
import { Plan } from "@/modules/workspaces/domain/plan";

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-09-30.acacia",
  typescript: true,
});

const RETAINED_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

function planFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return Plan.BUSINESS;
  if (priceId === env.STRIPE_PRICE_STARTER) return Plan.PRO;
  return null;
}

async function backfillPastDue(): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "past_due",
      subscriptionId: { not: null },
      deletedAt: null,
    },
  });

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        user.subscriptionId!,
      );
      const priceId = subscription.items.data[0]?.price.id;
      const pricePlan = planFromPriceId(priceId);
      const basePlan = pricePlan ?? (user.plan as Plan) ?? Plan.FREE;
      const entitledPlan = RETAINED_STATUSES.has(subscription.status)
        ? basePlan
        : Plan.FREE;

      const subscriptionId = subscription.id;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const newStatus =
        subscription.status === "past_due" ? "past_due" : subscription.status;

      if (
        user.plan !== entitledPlan ||
        user.subscriptionStatus !== newStatus ||
        user.stripeCustomerId !== stripeCustomerId
      ) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: entitledPlan,
            subscriptionStatus: newStatus,
            stripeCustomerId,
            subscriptionId,
          },
        });
        updated++;
      } else {
        unchanged++;
      }
    } catch (error) {
      errors++;
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        console.error(`Subscription not found for ${user.id}: ${error.message}`);
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`Database error for ${user.id}: ${error.message}`);
      } else {
        console.error(`Failed to backfill ${user.id}:`, error);
      }
    }
  }

  console.log(
    `Backfill complete. Updated: ${updated}, unchanged: ${unchanged}, errors: ${errors}`,
  );
}

void backfillPastDue().finally(async () => {
  await prisma.$disconnect();
});

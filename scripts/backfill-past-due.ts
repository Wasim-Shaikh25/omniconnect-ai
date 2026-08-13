import Razorpay from "razorpay";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { env } from "@/shared/config";
import { Plan } from "@/modules/workspaces";

if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured");
}

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

const RETAINED_STATUSES = new Set<string>([
  "active",
  "authenticated",
  "created",
  "pending",
  "halted",
]);

const ACTIVE_STATUSES = new Set<string>(["active", "authenticated", "created"]);
const PAST_DUE_STATUSES = new Set<string>(["pending", "halted"]);
const CANCELED_STATUSES = new Set<string>(["cancelled", "canceled"]);
const COMPLETED_STATUSES = new Set<string>(["completed"]);

function normalizeSubscriptionStatus(
  status: string,
): "active" | "past_due" | "canceled" | "completed" | "unknown" {
  if (ACTIVE_STATUSES.has(status)) return "active";
  if (PAST_DUE_STATUSES.has(status)) return "past_due";
  if (CANCELED_STATUSES.has(status)) return "canceled";
  if (COMPLETED_STATUSES.has(status)) return "completed";
  return "unknown";
}

function planFromPlanId(planId: string | undefined): Plan | null {
  if (!planId) return null;
  if (planId === env.RAZORPAY_PLAN_BUSINESS) return Plan.BUSINESS;
  if (planId === env.RAZORPAY_PLAN_PRO) return Plan.PRO;
  return null;
}

async function backfillPastDue(): Promise<void> {
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
      const subscription = await razorpay.subscriptions.fetch(user.subscriptionId!);
      const planId = subscription.plan_id;
      const planFromSubscription = planFromPlanId(planId);
      const basePlan = planFromSubscription ?? (user.plan as Plan) ?? Plan.FREE;
      const entitledPlan = RETAINED_STATUSES.has(subscription.status)
        ? basePlan
        : Plan.FREE;

      const paymentCustomerId = subscription.customer_id;
      const newStatus = normalizeSubscriptionStatus(subscription.status);

      if (
        user.plan !== entitledPlan ||
        user.subscriptionStatus !== newStatus ||
        user.paymentCustomerId !== paymentCustomerId
      ) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: entitledPlan,
            subscriptionStatus: newStatus,
            paymentCustomerId,
          },
        });
        updated++;
      } else {
        unchanged++;
      }
    } catch (error) {
      errors++;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

import { prisma } from "@/shared/database";
import {
  detectionService,
  recommendationService,
  actionPlanService,
  goalService,
} from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "Phase3 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Phase3 Store",
      provider: "SHOPIFY",
      domain: "test3.myshopify.com",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      igUserId: "ig-789",
      username: "phase3_user",
      lifecycleStage: "LEAD",
      consent: "PENDING",
    },
  });

  await prisma.follower.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      igUserId: "ig-789",
      username: "phase3_user",
      followedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await detectionService.analyzeStore(org.id, store.id);

  const insights = await prisma.businessInsight.findMany({
    where: { organizationId: org.id },
    orderBy: { generatedAt: "desc" },
  });
  console.log("insights:", insights.map((i) => ({ title: i.title, severity: i.severity })));

  const recommendations = await recommendationService.generateFromOpenInsights(org.id, store.id);
  console.log("recommendations:", recommendations.map((r) => ({ title: r.title, actionType: r.actionType, riskTier: r.riskTier })));

  const noOrdersRec = recommendations.find((r) => r.actionType === "GENERATE_COUPON");
  if (noOrdersRec) {
    const plan = await actionPlanService.createFromRecommendation(noOrdersRec.id, "user-admin");
    await actionPlanService.approve(plan.id, "user-admin", "ADMIN");
    const result = await actionPlanService.execute(plan.id, "user-admin", "ADMIN");
    console.log("coupon plan executed:", { status: result.plan.status, outcome: result.outcome.status, before: result.outcome.beforeValue, after: result.outcome.afterValue });
  }

  const followerRec = recommendations.find((r) => r.actionType === "CREATE_DM_CAMPAIGN");
  if (followerRec) {
    const plan = await actionPlanService.createFromRecommendation(followerRec.id, "user-admin");
    await actionPlanService.approve(plan.id, "user-admin", "ADMIN");
    const result = await actionPlanService.execute(plan.id, "user-admin", "ADMIN");
    console.log("dm campaign plan executed:", { status: result.plan.status, outcome: result.outcome.status });
  }

  const goal = await goalService.create(org.id, store.id, "Gain 5 followers", "follower_count", 5, null, "user-admin");
  console.log("goal created:", { name: goal.name, baseline: goal.baseline, target: goal.target });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

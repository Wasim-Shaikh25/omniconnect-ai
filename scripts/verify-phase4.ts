import { prisma } from "@/shared/database";
import {
  detectionService,
  recommendationService,
  actionPlanService,
  predictionService,
  hypothesisService,
  businessLearningService,
} from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "Phase4 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Phase4 Store",
      provider: "SHOPIFY",
      domain: "test4.myshopify.com",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      igUserId: "ig-999",
      username: "phase4_user",
      lifecycleStage: "CUSTOMER",
      consent: "PENDING",
    },
  });

  await prisma.signal.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      eventType: "NewMessage",
      subjectType: "customer",
      subjectId: customer.id,
      source: "TEST",
      data: {},
      occurredAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      relatedEntities: [],
    },
  });

  await prisma.follower.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      igUserId: "ig-999",
      username: "phase4_user",
      followedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    },
  });

  await detectionService.analyzeStore(org.id, store.id);
  await recommendationService.generateFromOpenInsights(org.id, store.id);
  const predictions = await predictionService.generateForStore(org.id, store.id);
  const hypotheses = await hypothesisService.generateFromOpenInsights(org.id, store.id);

  console.log("predictions:", predictions.map((p) => ({ type: p.predictionType, status: p.status, estimate: p.estimate })));
  console.log("hypotheses:", hypotheses.map((h) => ({ statement: h.statement.slice(0, 60), status: h.status })));

  const recommendations = await recommendationService.listOpen(org.id, store.id);
  const noOrdersRec = recommendations.find((r) => r.actionType === "GENERATE_COUPON");
  if (noOrdersRec) {
    const plan = await actionPlanService.createFromRecommendation(noOrdersRec.id, "user-admin");
    await actionPlanService.approve(plan.id, "user-admin", "ADMIN");
    const result = await actionPlanService.execute(plan.id, "user-admin", "ADMIN");
    console.log("action plan executed:", { status: result.plan.status, outcome: result.outcome.status, before: result.outcome.beforeValue, after: result.outcome.afterValue });
  }

  const learning = await businessLearningService.list(org.id, store.id, 10);
  console.log("business learning:", learning.map((l) => ({ ruleName: l.ruleName, weight: l.weight, success: l.successCount, failure: l.failureCount })));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

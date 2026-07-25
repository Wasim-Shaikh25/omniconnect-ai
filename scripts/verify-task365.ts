import { prisma } from "@/shared/database";
import { kpiService } from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "TASK-365 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "KPI Store",
      provider: "SHOPIFY",
      domain: "kpi.myshopify.com",
    },
  });

  const now = new Date();

  await prisma.signal.createMany({
    data: [
      {
        organizationId: org.id,
        storeId: store.id,
        eventType: "TestSignal",
        schemaVersion: 1,
        subjectType: "store",
        subjectId: store.id,
        stage: "Discovery",
        relatedEntities: [],
        data: {},
        lineage: {},
        source: "test",
        occurredAt: now,
        ingestedAt: now,
        freshnessMs: 60_000,
        qualityStatus: "OK",
      },
    ],
  });

  await prisma.businessInsight.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      type: "RISK",
      severity: "HIGH",
      title: "Revenue drop",
      description: "...",
      status: "RESOLVED",
      evidence: { reasonCodes: ["test"], materialityScore: 0.8 },
      generatedAt: now,
    },
  });

  await prisma.recommendation.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      title: "Test recommendation",
      description: "...",
      objective: "test",
      reasonCodes: ["test"],
      riskTier: "TIER_1",
      actionType: "CREATE_DM_CAMPAIGN",
      actionParams: {},
      status: "ACCEPTED",
      generatedAt: now,
    },
  });

  const plan = await prisma.actionPlan.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      title: "Test plan",
      steps: {},
      targetMetric: "order_count",
      status: "EXECUTED",
      executedAt: now,
    },
  });

  await prisma.outcome.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      actionPlanId: plan.id,
      metricName: "order_count",
      observationWindowDays: 7,
      status: "SUCCESS",
    },
  });

  await prisma.entityLink.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      sourceType: "customer",
      sourceId: "c1",
      targetType: "conversation",
      targetId: "conv1",
      linkType: "identity",
      confidence: "VERIFIED",
      status: "ACTIVE",
    },
  });

  const snapshot = await kpiService.getWorkspaceSnapshot(org.id, store.id, "7d");
  console.log("Store snapshot:", JSON.stringify(snapshot, null, 2));

  const orgSnapshot = await kpiService.getWorkspaceSnapshot(org.id, undefined, "7d");
  console.log("Org snapshot:", JSON.stringify(orgSnapshot, null, 2));

  if (snapshot.iava === 0) {
    throw new Error("Expected IAVA > 0");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { prisma } from "@/shared/database";
import { syncProducts } from "@/modules/ecommerce";
import { detectionService, recommendationService, actionPlanService } from "@/modules/intelligence";
import { ensureSubscribers } from "@/server/subscribers";

async function main() {
  ensureSubscribers();

  const org = await prisma.organization.create({ data: { name: "TASK-360 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Availability Store",
      provider: "SHOPIFY",
      domain: "availability.myshopify.com",
    },
  });

  await prisma.integration.create({
    data: {
      type: "ECOMMERCE",
      provider: "MOCK",
      storeId: store.id,
    },
  });

  const syncResult = await syncProducts(store.id);
  if (!syncResult.ok) {
    console.error("sync failed", syncResult.error);
    await prisma.$disconnect();
    return;
  }

  const products = await prisma.product.findMany({ where: { storeId: store.id } });
  const target = products.find((p) => p.title.toLowerCase().includes("sneakers"));
  if (!target) {
    console.error("target product not found");
    await prisma.$disconnect();
    return;
  }

  await prisma.product.update({ where: { id: target.id }, data: { inventory: 0 } });

  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      igUserId: "ig-360",
      username: "asker_360",
      lifecycleStage: "CUSTOMER",
      consent: "GRANTED",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      channel: "INSTAGRAM",
      externalId: "conv-360",
      status: "AI_ACTIVE",
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "CUSTOMER",
      content: "Do you have Classic Sneakers in size 9?",
    },
  });

  await prisma.signal.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      eventType: "NewMessage",
      subjectType: "conversation",
      subjectId: conversation.id,
      source: "TEST",
      data: { externalUserId: "ig-360", channel: "INSTAGRAM", content: "Do you have Classic Sneakers in size 9?" },
      occurredAt: new Date(),
      relatedEntities: [{ type: "customer", id: customer.id }],
    },
  });

  await detectionService.analyzeStore(org.id, store.id);
  await recommendationService.generateFromOpenInsights(org.id, store.id);

  const insights = await prisma.businessInsight.findMany({ where: { organizationId: org.id, storeId: store.id } });
  const availabilityInsight = insights.find((i) => i.title.toLowerCase().includes("out of stock"));
  console.log("availability insight:", availabilityInsight?.title ?? "none");

  const recommendations = await recommendationService.listOpen(org.id, store.id);
  const altRec = recommendations.find((r) => r.actionType === "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN");
  console.log("alternative product recommendation:", altRec?.title ?? "none");

  if (altRec) {
    const plan = await actionPlanService.createFromRecommendation(altRec.id, org.id, "user-admin");
    await actionPlanService.approve(plan.id, org.id, "user-admin", "ADMIN");
    const result = await actionPlanService.execute(plan.id, org.id, "user-admin", "ADMIN");
    console.log("action plan executed:", { status: result.plan.status, outcome: result.outcome.status });

    const campaign = await prisma.dmCampaign.findFirst({ where: { storeId: store.id, campaignType: "ALTERNATIVE_PRODUCT" } });
    console.log("dm campaign:", campaign ? { type: campaign.campaignType, audience: campaign.audienceCriteria } : "none");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

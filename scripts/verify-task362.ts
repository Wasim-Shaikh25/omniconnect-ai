import { prisma } from "@/shared/database";
import { ensureSubscribers } from "@/server/subscribers";
import { syncProducts } from "@/modules/ecommerce";
import { nextBestActionService, proactiveNotificationService } from "@/modules/intelligence";

async function main() {
  ensureSubscribers();

  const org = await prisma.organization.create({ data: { name: "TASK-362 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "NBA Store",
      provider: "SHOPIFY",
      domain: "nba.myshopify.com",
    },
  });

  await prisma.integration.create({
    data: { type: "ECOMMERCE", provider: "MOCK", storeId: store.id },
  });

  const syncResult = await syncProducts(store.id);
  if (!syncResult.ok) {
    console.error("sync failed", syncResult.error);
    await prisma.$disconnect();
    return;
  }

  // Connect a user to receive proactive notifications
  const user = await prisma.user.create({
    data: {
      email: `task362-${Date.now()}@example.com`,
      organizationId: org.id,
    },
  });

  // Create a high-intent customer and conversation
  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      igUserId: "ig-nba-1",
      username: "buyer_362",
      lifecycleStage: "CUSTOMER",
      consent: "GRANTED",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      channel: "INSTAGRAM",
      externalId: "conv-nba-1",
      status: "AI_ACTIVE",
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "CUSTOMER",
      content: "I want to buy Running Shoes, do you offer a discount?",
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "CUSTOMER",
      content: "Also do you have Wool Beanie in stock?",
    },
  });

  const inboxNba = await nextBestActionService.forConversation(org.id, store.id, conversation.id);
  console.log("Inbox NBA:", JSON.stringify({
    priority: inboxNba?.priority,
    priorityScore: inboxNba?.priorityScore,
    suggestedReply: inboxNba?.suggestedReply,
    productCount: inboxNba?.relevantProducts.length,
    suppressSales: inboxNba?.suppressSales,
  }, null, 2));

  // Test orders NBA (mock orders will trigger post-delivery upsells)
  const ordersNba = await nextBestActionService.forStoreOrders(org.id, store.id);
  console.log("Orders NBA:", JSON.stringify({
    atRisk: ordersNba?.atRiskHighValueCustomers.length,
    upsells: ordersNba?.postDeliveryUpsells.length,
    suppressed: ordersNba?.suppressed,
    reasons: ordersNba?.reasons,
  }, null, 2));

  // Test CRM NBA
  const crmNba = await nextBestActionService.forCrm(org.id);
  console.log("CRM NBA:", JSON.stringify({
    retention: crmNba?.retentionCandidates.length,
    advocates: crmNba?.advocateCandidates.length,
    suppressed: crmNba?.suppressed,
    reasons: crmNba?.reasons,
  }, null, 2));

  // Test proactive notification for an at-risk high-value recommendation
  const atRiskCustomer = await prisma.customer.create({
    data: {
      storeId: store.id,
      igUserId: "ig-nba-2",
      username: "vip_362",
      lifecycleStage: "CUSTOMER",
      consent: "GRANTED",
    },
  });

  const insight = {
    id: `insight-nba-${Date.now()}`,
    organizationId: org.id,
    storeId: store.id,
    type: "RISK" as const,
    severity: "HIGH" as const,
    status: "OPEN" as const,
    title: "High-value customer at risk",
    description: `${atRiskCustomer.username ?? "Customer"} has not purchased recently.`,
    evidence: null,
    deepLink: null,
    generatedAt: new Date(),
    dismissedAt: null,
    snoozedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await proactiveNotificationService.notifyInsight(insight);

  const notifications = await prisma.notification.findMany({
    where: { storeId: store.id, type: "INTELLIGENCE" },
  });
  console.log("Proactive notifications:", notifications.length);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

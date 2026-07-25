import { prisma } from "@/shared/database";
import { makeDetectionService } from "@/modules/intelligence/application/detection";
import { makeRecommendationService } from "@/modules/intelligence/application/recommendation";
import { actionPlanService } from "@/modules/intelligence";
import {
  PrismaSignalRepository,
  PrismaBusinessInsightRepository,
  PrismaMetricRepository,
  PrismaRecommendationRepository,
  PrismaEntityLinkRepository,
} from "@/modules/intelligence/infrastructure/repositories";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";

const now = new Date();

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function fakeEcommerce(): EcommerceQueries {
  return {
    getStoreConnection: async () => ({ connected: true, integration: null, productCount: 3 }),
    listProducts: async () => [
      { id: "p1", externalId: "ext-1", title: "Widget A", price: 99, currency: "INR", inventory: 42, imageUrl: null },
      { id: "p2", externalId: "ext-2", title: "Widget B", price: 149, currency: "INR", inventory: 18, imageUrl: null },
      { id: "p3", externalId: "ext-3", title: "Widget C", price: 199, currency: "INR", inventory: 7, imageUrl: null },
    ],
    listCoupons: async () => [],
    listOrders: async () => [
      // previous 7-day window
      { externalId: "ord-prev-1", total: 1000, currency: "INR", createdAt: daysAgo(8), customerRef: "cust-1" },
      { externalId: "ord-prev-2", total: 1000, currency: "INR", createdAt: daysAgo(9), customerRef: "cust-2" },
      // current 7-day window: one low-AOV order
      { externalId: "ord-curr-1", total: 100, currency: "INR", createdAt: daysAgo(1), customerRef: "cust-3" },
    ],
  };
}

function fakeConversations(): ConversationQueries {
  return {
    listConversations: async () => [],
    getConversation: async () => null,
  };
}

function fakeCrm(): CrmQueries {
  return {
    listCustomers: async () => [],
    listFollowers: async () => [],
    getCustomerProfile: async () => null,
  };
}

async function main() {
  const org = await prisma.organization.create({ data: { name: "TASK-361 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Revenue Store",
      provider: "SHOPIFY",
      domain: "revenue.myshopify.com",
    },
  });

  await prisma.integration.create({
    data: {
      type: "ECOMMERCE",
      provider: "MOCK",
      storeId: store.id,
    },
  });

  const ecommerce = fakeEcommerce();
  const detectionService = makeDetectionService({
    signals: new PrismaSignalRepository(),
    insights: new PrismaBusinessInsightRepository(),
    metrics: new PrismaMetricRepository(),
    links: new PrismaEntityLinkRepository(),
    ecommerce,
    conversations: fakeConversations(),
    crm: fakeCrm(),
    now,
  });

  const recommendationService = makeRecommendationService({
    insights: new PrismaBusinessInsightRepository(),
    recommendations: new PrismaRecommendationRepository(),
    ecommerce,
  });

  await detectionService.analyzeStore(org.id, store.id);
  const insights = await prisma.businessInsight.findMany({ where: { organizationId: org.id, storeId: store.id } });
  const revenueInsight = insights.find((i) => i.title.toLowerCase().includes("revenue"));
  console.log("revenue insight:", revenueInsight?.title ?? "none");

  const recommendations = await recommendationService.generateFromOpenInsights(org.id, store.id);
  const rec = recommendations.find((r) => r.title.toLowerCase().includes("coupon") || r.title.toLowerCase().includes("campaign"));
  console.log("recommendation:", rec ? { title: rec.title, actionType: rec.actionType } : "none");

  if (rec) {
    const plan = await actionPlanService.createFromRecommendation(rec.id, "user-admin");
    await actionPlanService.approve(plan.id, "user-admin", "ADMIN");
    const result = await actionPlanService.execute(plan.id, "user-admin", "ADMIN");
    console.log("action plan executed:", { status: result.plan.status, outcome: result.outcome.status });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

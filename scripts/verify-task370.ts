import { prisma } from "@/shared/database";
import {
  PrismaSignalRepository,
  PrismaBusinessInsightRepository,
  PrismaMetricRepository,
  PrismaEntityLinkRepository,
  PrismaRecommendationRepository,
  PrismaOutcomeRepository,
  PrismaGoalRepository,
  PrismaPredictionRepository,
  PrismaBusinessLearningRepository,
  PrismaDailyActionRepository,
  PrismaJourneyRepository,
} from "@/modules/intelligence/infrastructure/repositories";
import { makeDetectionService } from "@/modules/intelligence/application/detection";
import { makeRecommendationService } from "@/modules/intelligence/application/recommendation";
import { makeRecommendationLifecycleService } from "@/modules/intelligence/application/recommendation-lifecycle";
import { makeBusinessBrainContextService } from "@/modules/intelligence/application/business-brain-context";
import type { EcommerceQueries } from "@/modules/ecommerce";
import { makeDetectCommerceInsights } from "@/modules/ecommerce/application/detect-insights";
import type { ConversationQueries, DetectConversationInsights } from "@/modules/conversations";
import { makeDetectConversationInsights } from "@/modules/conversations/application/detect-insights";
import type { CrmQueries, DetectCrmInsights } from "@/modules/crm";
import { makeDetectCrmInsights } from "@/modules/crm/application/detect-insights";
import type { GrowthQueries, DetectGrowthInsights } from "@/modules/growth";
import { makeDetectGrowthInsights } from "@/modules/growth/application/detect-insights";
import type { BrandDealQueries, DetectBrandDealInsights } from "@/modules/branddeals";
import { makeDetectBrandDealInsights } from "@/modules/branddeals/application/detect-insights";

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
      { externalId: "ord-prev-1", total: 1000, currency: "INR", createdAt: daysAgo(8), customerRef: "cust-1" },
      { externalId: "ord-prev-2", total: 1000, currency: "INR", createdAt: daysAgo(9), customerRef: "cust-2" },
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

function fakeGrowth(): GrowthQueries {
  return {
    listUgc: async () => [],
    listAmbassadors: async () => [],
    listReferrals: async () => [],
    listCampaigns: async () => [],
    listBackInStock: async () => [],
    listCommentUnlockCampaigns: async () => [],
  };
}

function fakeBrandDeals(): BrandDealQueries {
  return {
    listByStore: async () => [],
  };
}

async function main() {
  const org = await prisma.organization.create({ data: { name: "TASK-370 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Lifecycle Store",
      provider: "SHOPIFY",
      domain: "lifecycle.myshopify.com",
    },
  });

  await prisma.integration.create({
    data: { type: "ECOMMERCE", provider: "MOCK", storeId: store.id },
  });

  const ecommerce = fakeEcommerce();
  const crm = fakeCrm();
  const conversations = fakeConversations();
  const growth = fakeGrowth();
  const brandDeals = fakeBrandDeals();
  const detectCommerceInsights = makeDetectCommerceInsights({ ecommerce, now });
  const detectCrmInsights = makeDetectCrmInsights({ crm, now });
  const detectConversationInsights = makeDetectConversationInsights({ conversations, now });
  const detectGrowthInsights = makeDetectGrowthInsights({ growth, now });
  const detectBrandDealInsights = makeDetectBrandDealInsights({ brandDeals, now });
  const insights = new PrismaBusinessInsightRepository();
  const recommendations = new PrismaRecommendationRepository();
  const detectionService = makeDetectionService({
    signals: new PrismaSignalRepository(),
    insights,
    metrics: new PrismaMetricRepository(),
    links: new PrismaEntityLinkRepository(),
    detectCommerceInsights,
    detectCrmInsights,
    detectConversationInsights,
    detectGrowthInsights,
    detectBrandDealInsights,
    ecommerce,
    conversations,
    crm,
    now,
  });

  const recommendationService = makeRecommendationService({ insights, recommendations, ecommerce });
  const lifecycleService = makeRecommendationLifecycleService({ recommendations, now });
  const brainContextService = makeBusinessBrainContextService({
    insights,
    recommendations,
    predictions: new PrismaPredictionRepository(),
    outcomes: new PrismaOutcomeRepository(),
    learning: new PrismaBusinessLearningRepository(),
    goals: new PrismaGoalRepository(),
    dailyActions: new PrismaDailyActionRepository(),
    journeys: new PrismaJourneyRepository(),
  });

  await detectionService.analyzeStore(org.id, store.id);
  const generated = await recommendationService.generateFromOpenInsights(org.id, store.id);
  console.log("generated recommendations:", generated.map((r) => ({ title: r.title, producedByModule: r.producedByModule, validFrom: r.validFrom })));

  const prioritized = await lifecycleService.prioritizeRecommendations(org.id, store.id, 10);
  console.log("prioritized:", prioritized.map((r) => ({ title: r.title, score: r.score })));

  const context = await brainContextService.getContext(org.id, store.id);
  console.log("business brain context:", { summary: context.summary, insights: context.topInsights.length, recommendations: context.topRecommendations.length });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

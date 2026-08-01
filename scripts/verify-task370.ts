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
  const products = [
    { id: "p1", storeId: "store-1", externalId: "ext-1", title: "Widget A", description: null, price: 99, currency: "INR", inventory: 42, imageUrl: null, deletedAt: null },
    { id: "p2", storeId: "store-1", externalId: "ext-2", title: "Widget B", description: null, price: 149, currency: "INR", inventory: 18, imageUrl: null, deletedAt: null },
    { id: "p3", storeId: "store-1", externalId: "ext-3", title: "Widget C", description: null, price: 199, currency: "INR", inventory: 7, imageUrl: null, deletedAt: null },
  ];
  return {
    getStoreConnection: async () => ({ connected: true, integration: null, productCount: 3, orderCount: 0 }),
    listProducts: async () => products,
    listProductsPaginated: async (_storeId, pagination, _search) => ({
      items: products.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit),
      total: products.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(products.length / pagination.limit) || 1,
    }),
    countProducts: async () => products.length,
    listCoupons: async () => [],
    listCouponsPaginated: async (_storeId, pagination, _search) => ({
      items: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0,
    }),
    countCoupons: async () => 0,
    listOrders: async () => [
      { id: "op1", externalId: "ord-prev-1", storeId: "store-1", total: 1000, currency: "INR", orderDate: daysAgo(8), createdAt: daysAgo(8), updatedAt: daysAgo(8), syncedAt: daysAgo(8), couponCode: null, customerRef: "cust-1", customerEmail: null, attributedMediaId: null, attributionSource: null, isFirstTimeCustomer: false },
      { id: "op2", externalId: "ord-prev-2", storeId: "store-1", total: 1000, currency: "INR", orderDate: daysAgo(9), createdAt: daysAgo(9), updatedAt: daysAgo(9), syncedAt: daysAgo(9), couponCode: null, customerRef: "cust-2", customerEmail: null, attributedMediaId: null, attributionSource: null, isFirstTimeCustomer: false },
      { id: "oc1", externalId: "ord-curr-1", storeId: "store-1", total: 100, currency: "INR", orderDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1), syncedAt: daysAgo(1), couponCode: null, customerRef: "cust-3", customerEmail: null, attributedMediaId: null, attributionSource: null, isFirstTimeCustomer: true },
    ],
    listOrdersPaginated: async (_storeId, pagination, _search) => ({
      items: [
        { id: "op1", externalId: "ord-prev-1", storeId: "store-1", total: 1000, currency: "INR", orderDate: daysAgo(8), createdAt: daysAgo(8), updatedAt: daysAgo(8), syncedAt: daysAgo(8), couponCode: null, customerRef: "cust-1", customerEmail: null, attributedMediaId: null, attributionSource: null, isFirstTimeCustomer: false },
        { id: "op2", externalId: "ord-prev-2", storeId: "store-1", total: 1000, currency: "INR", orderDate: daysAgo(9), createdAt: daysAgo(9), updatedAt: daysAgo(9), syncedAt: daysAgo(9), couponCode: null, customerRef: "cust-2", customerEmail: null, attributedMediaId: null, attributionSource: null, isFirstTimeCustomer: false },
        { id: "oc1", externalId: "ord-curr-1", storeId: "store-1", total: 100, currency: "INR", orderDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1), syncedAt: daysAgo(1), couponCode: null, customerRef: "cust-3", customerEmail: null, attributedMediaId: null, attributionSource: null, isFirstTimeCustomer: true },
      ],
      total: 3,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 1,
    }),
  };
}

function fakeConversations(): ConversationQueries {
  return {
    listConversations: async () => [],
    listConversationsPaginated: async (_storeId, pagination, _search) => ({
      items: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0,
    }),
    countConversations: async () => 0,
    getConversation: async () => null,
    findReplyByInReplyToMessageId: async () => null,
  };
}

function fakeCrm(): CrmQueries {
  return {
    listCustomers: async () => [],
    listFollowers: async () => [],
    listFollowersPaginated: async (_storeId, pagination, _search) => ({
      items: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0,
    }),
    countFollowers: async () => 0,
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

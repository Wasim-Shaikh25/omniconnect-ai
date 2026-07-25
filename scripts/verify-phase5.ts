import { prisma } from "@/shared/database";
import { Prisma } from "@prisma/client";
import { portfolioService, competitorIntelligenceService, costLatencyMonitor, predictionService } from "@/modules/intelligence";
import type { TrackedAccountRecord } from "@/modules/analytics";
import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis } from "@/modules/ai";

async function main() {
  const org = await prisma.organization.create({ data: { name: "Phase5 Test" } });
  const storeA = await prisma.store.create({
    data: { organizationId: org.id, name: "Phase5 Store A", provider: "SHOPIFY", domain: "a.myshopify.com" },
  });
  const storeB = await prisma.store.create({
    data: { organizationId: org.id, name: "Phase5 Store B", provider: "SHOPIFY", domain: "b.myshopify.com" },
  });

  const customerA = await prisma.customer.create({
    data: { storeId: storeA.id, igUserId: "ig-a", username: "customer_a", lifecycleStage: "CUSTOMER", consent: "PENDING" },
  });

  await prisma.signal.create({
    data: {
      organizationId: org.id,
      storeId: storeA.id,
      eventType: "NewMessage",
      subjectType: "customer",
      subjectId: customerA.id,
      source: "TEST",
      data: {},
      occurredAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      relatedEntities: [],
    },
  });

  await prisma.follower.create({
    data: { storeId: storeA.id, customerId: customerA.id, igUserId: "ig-a", username: "customer_a", followedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
  });

  await prisma.trackedAccount.create({
    data: {
      storeId: storeA.id,
      platform: "INSTAGRAM",
      handle: "rivalbrand",
      niche: "fashion",
      note: "test competitor",
      lastMedia: [{ id: "m1" }, { id: "m2" }] as unknown as Prisma.InputJsonValue,
      lastAnalysis: { summary: "strong", strengths: ["high engagement"], weaknesses: [], contentPatterns: ["reels"], recommendations: ["post more"], hashtags: [], audioSuggestion: "", bestTimeToPost: "", postingStrategy: "" } as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.metricDefinition.createMany({
    data: [
      { organizationId: org.id, name: "follower_count", displayName: "Followers", source: "TEST" },
      { organizationId: org.id, name: "conversation_count", displayName: "Conversations", source: "TEST" },
      { organizationId: org.id, name: "coupon_count", displayName: "Coupons", source: "TEST" },
      { organizationId: org.id, name: "product_count", displayName: "Products", source: "TEST" },
    ],
    skipDuplicates: true,
  });

  await predictionService.generateForStore(org.id, storeA.id);
  await predictionService.generateForStore(org.id, storeB.id);
  const snapshot = await portfolioService.generateSnapshot(org.id);
  console.log("portfolio snapshot:", {
    storeCount: snapshot.storeCount,
    totalRevenueEstimate: snapshot.totalRevenueEstimate,
    totalChurnRisk: snapshot.totalChurnRisk,
    topRecommendationType: snapshot.topRecommendationType,
    topRiskStoreId: snapshot.topRiskStoreId,
  });

  const accounts = await prisma.trackedAccount.findMany({ where: { storeId: storeA.id } });
  const insights = await competitorIntelligenceService.generateForStore(org.id, storeA.id, accounts as TrackedAccountRecord[]);
  console.log("competitor insights:", insights.map((i) => ({ handle: i.competitorHandle, metricName: i.metricName, value: i.value, delta: i.benchmarkDelta })));

  await costLatencyMonitor.record(org.id, "test-op", "intelligence", 12.5, 0.05, "OK");
  const health = await costLatencyMonitor.summary(org.id);
  console.log("system health:", health);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

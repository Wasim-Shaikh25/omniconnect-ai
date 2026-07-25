import { prisma } from "@/shared/database";
import { ensureSubscribers } from "@/server/subscribers";
import { syncProducts } from "@/modules/ecommerce";
import { growthService } from "@/modules/growth";
import { brandDealCommands } from "@/modules/branddeals";
import { nextBestActionService } from "@/modules/intelligence";

async function main() {
  ensureSubscribers();

  const org = await prisma.organization.create({ data: { name: "TASK-363 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "NBA Content Store",
      provider: "SHOPIFY",
      domain: "content.myshopify.com",
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

  // Content NBA inputs: collect UGC
  await growthService.collectUgc({
    storeId: store.id,
    creatorHandle: "creator_a",
    mediaUrl: "https://example.com/reel1.mp4",
    mediaType: "REEL",
    source: "MENTION",
    caption: "Love the Running Shoes!",
  });

  // Campaigns NBA inputs: create + send a DM campaign and leave one in draft
  const sentCampaign = await growthService.createDmCampaign({
    storeId: store.id,
    campaignType: "RE_ENGAGE",
    audienceCriteria: { segment: "inactive" },
    scheduledAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  });
  await growthService.sendDmCampaign(sentCampaign.id, store.id);

  const draftCampaign = await growthService.createDmCampaign({
    storeId: store.id,
    campaignType: "ABANDONED_CART",
    audienceCriteria: { segment: "abandoned" },
    scheduledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });

  // Brand Deals NBA inputs
  const oldDeal = await brandDealCommands.createBrandDeal({
    storeId: store.id,
    brandName: "Old Brand",
    value: 50000,
    status: "NEGOTIATING",
  });

  // Force updatedAt back so it appears stuck
  await prisma.brandDeal.update({
    where: { id: oldDeal.id },
    data: { updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  });

  const deliveredDeal = await brandDealCommands.createBrandDeal({
    storeId: store.id,
    brandName: "Delivered Brand",
    value: 25000,
    status: "DELIVERED",
  });
  await prisma.brandDeal.update({
    where: { id: deliveredDeal.id },
    data: { updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
  });

  // Competitor Intelligence NBA inputs
  await prisma.competitorInsight.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      competitorHandle: "rival_a",
      metricName: "post_volume",
      value: 12,
      benchmarkDelta: 5,
      source: "analytics.trackedAccount",
    },
  });
  await prisma.competitorInsight.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      competitorHandle: "rival_b",
      metricName: "post_volume",
      value: 8,
      benchmarkDelta: 2,
      source: "analytics.trackedAccount",
    },
  });
  await prisma.competitorInsight.create({
    data: {
      organizationId: org.id,
      storeId: store.id,
      competitorHandle: "rival_c",
      metricName: "content_diversity",
      value: 3,
      benchmarkDelta: -1,
      source: "analytics.trackedAccount",
    },
  });

  const contentNba = await nextBestActionService.forContent(store.id);
  console.log("Content NBA:", JSON.stringify({
    repeatFormats: contentNba.repeatFormats.length,
    contentGaps: contentNba.contentGaps.length,
    suppressed: contentNba.suppressed,
  }, null, 2));

  const campaignsNba = await nextBestActionService.forCampaigns(store.id);
  console.log("Campaigns NBA:", JSON.stringify({
    underperforming: campaignsNba.underperforming.length,
    highPerforming: campaignsNba.highPerforming.length,
    recommendedAction: campaignsNba.recommendedAction,
  }, null, 2));

  const brandDealsNba = await nextBestActionService.forBrandDeals(store.id);
  console.log("Brand Deals NBA:", JSON.stringify({
    followUps: brandDealsNba.followUps.length,
    deliverableRisks: brandDealsNba.deliverableRisks.length,
    recommendedAction: brandDealsNba.recommendedAction,
  }, null, 2));

  const competitorNba = await nextBestActionService.forCompetitorIntelligence(org.id, store.id);
  console.log("Competitor NBA:", JSON.stringify({
    experiments: competitorNba.experiments.length,
    warnings: competitorNba.warnings.length,
  }, null, 2));

  // Verify cross-module signals were ingested
  const signals = await prisma.signal.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });
  console.log("Cross-module signals:", signals.length);
  for (const s of signals.slice(0, 10)) {
    console.log(`  - ${s.eventType} (${s.subjectType})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

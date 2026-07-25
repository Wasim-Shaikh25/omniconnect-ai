import { prisma } from "@/shared/database";
import { runWeek4ThinSlice } from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "Week 4 Thin Slice" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Thin Slice Store",
      provider: "CUSTOM",
      domain: "thin-slice.myshopify.com",
    },
  });

  await prisma.integration.create({
    data: {
      type: "ECOMMERCE",
      provider: "CUSTOM",
      externalId: "thin-slice",
      accessToken: "qa-token",
      storeId: store.id,
    },
  });

  const outOfStockTitle = "Sold-Out Sneakers";
  const alternativeTitle = "Classic Sneakers";

  // Seed one out-of-stock product that the conversation mentions, plus enough
  // out-of-stock products to make availability the dominant driver in the
  // revenue-decline diagnosis.
  const products: { externalId: string; title: string; inventory: number; storeId: string }[] = [
    { externalId: "prod-0", title: outOfStockTitle, inventory: 0, storeId: store.id },
    { externalId: "prod-alt", title: alternativeTitle, inventory: 42, storeId: store.id },
    ...Array.from({ length: 20 }, (_, i) => ({
      externalId: `prod-${i + 1}`,
      title: `Out of Stock Item ${i + 1}`,
      inventory: 0,
      storeId: store.id,
    })),
  ];

  await prisma.product.createMany({ data: products });

  // Reference time is 10 days in the future. The mock connector's orders are
  // created with the real current timestamp, so they land in the "previous"
  // 7-day window while the "current" 7-day window is empty, producing a revenue
  // decline. Product/message signals are emitted at `now - 1 day` so they are
  // considered recent relative to `now`.
  const now = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  const result = await runWeek4ThinSlice({
    organizationId: org.id,
    storeId: store.id,
    userId: "qa-admin",
    userRole: "ADMIN",
    outOfStockProductTitle: outOfStockTitle,
    alternativeProductTitle: alternativeTitle,
    conversationContent: `Hi, do you have the ${outOfStockTitle} in stock? I really want to buy them.`,
    now,
  });

  console.log("Thin slice result:", JSON.stringify(result, null, 2));

  if (!result.revenueInsightId) throw new Error("Expected a revenue-decline insight");
  if (!result.alternativeProductRecommendationId) throw new Error("Expected an alternative-product recommendation");
  if (!result.actionPlanId) throw new Error("Expected an approved action plan");
  if (!result.outcomeId) throw new Error("Expected an outcome measurement");
  if (!result.dmCampaignCreated) throw new Error("Expected DM campaign to be created");
  if (result.alternativeProductTitle !== alternativeTitle) throw new Error("Expected correct alternative product");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

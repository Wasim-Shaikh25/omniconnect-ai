import { prisma } from "@/shared/database";
import { goalAutomationService } from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "TASK-364 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Automation Store",
      provider: "SHOPIFY",
      domain: "auto.myshopify.com",
    },
  });

  const templates = goalAutomationService.listTemplates();
  console.log("Templates:", templates.length);
  for (const t of templates) {
    console.log(`  - ${t.id}: ${t.name}`);
  }

  const result = await goalAutomationService.createFromTemplate({
    organizationId: org.id,
    storeId: store.id,
    templateId: "abandoned-cart",
    target: 25,
    audienceEstimate: 500,
    discountPct: 8,
    consentConfirmed: true,
    daysSinceLastTouch: 7,
    actionsPerDay: 1,
  });

  console.log("Goal:", { id: result.goal.id, name: result.goal.name, target: result.goal.target });
  console.log("Recommendation:", { id: result.recommendation.id, status: result.recommendation.status, actionType: result.recommendation.actionType });
  console.log("ActionPlan:", { id: result.actionPlan.id, status: result.actionPlan.status });
  console.log("Guard:", JSON.stringify(result.guard, null, 2));

  const blocked = await goalAutomationService.createFromTemplate({
    organizationId: org.id,
    storeId: store.id,
    templateId: "product-launch",
    target: 100,
    audienceEstimate: 5000,
    discountPct: 30,
    consentConfirmed: false,
    daysSinceLastTouch: 1,
    actionsPerDay: 5,
  });

  console.log("Blocked guard violations:", blocked.guard.violations.length);
  console.log("Blocked guard:", JSON.stringify(blocked.guard.violations, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

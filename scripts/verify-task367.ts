import { prisma } from "@/shared/database";
import { qualityAssuranceService, rolloutService, riskMitigationRegistry } from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "TASK-367 Test" } });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Quality Store",
      provider: "CUSTOM",
      domain: "quality.myshopify.com",
    },
  });

  await prisma.integration.create({
    data: {
      type: "ECOMMERCE",
      provider: "CUSTOM",
      externalId: "qa-store",
      accessToken: "qa-token",
      storeId: store.id,
    },
  });

  await prisma.product.create({
    data: {
      externalId: "qa-product-1",
      title: "QA Product",
      inventory: 0,
      storeId: store.id,
    },
  });

  await prisma.product.create({
    data: {
      externalId: "qa-product-2",
      title: "QA Alternative",
      inventory: 10,
      storeId: store.id,
    },
  });

  const report = await qualityAssuranceService.runAll({
    organizationId: org.id,
    storeId: store.id,
    userId: "qa-user",
    userRole: "ADMIN",
  });

  console.log("Quality report:", JSON.stringify(report, null, 2));

  const gates = rolloutService.getGates();
  console.log("Rollout gates:", JSON.stringify(gates, null, 2));

  const ga = rolloutService.canExecute("GA", "production", "TIER_2");
  console.log("GA TIER_2 production:", ga);

  const mitigations = riskMitigationRegistry.list();
  console.log("Risk mitigations:", mitigations.length);

  if (report.overall !== "PASS") {
    const failed = report.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.reason}`);
    throw new Error(`Quality checks failed:\n${failed.join("\n")}`);
  }

  if (ga.allowed) {
    throw new Error("Expected GA gate to be disabled by default");
  }

  if (mitigations.length === 0) {
    throw new Error("Expected risk mitigations");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

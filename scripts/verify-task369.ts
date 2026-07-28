import { prisma } from "@/shared/database";
import {
  unifiedContextService,
  knowledgeGraphService,
  featureService,
  goalPlanGenerationService,
  learningEvidenceService,
  modelOpsService,
  predictionPrioritizationService,
  intelligenceFeedbackService,
  chartAcceptanceService,
  dataQualityGateService,
} from "@/modules/intelligence";

async function main() {
  const org = await prisma.organization.create({ data: { name: "Task 369 Validation" } });
  const store = await prisma.store.create({
    data: { organizationId: org.id, name: "Validation Store", provider: "CUSTOM", domain: "validation.myshopify.com" },
  });

  await prisma.integration.create({
    data: { type: "ECOMMERCE", provider: "CUSTOM", externalId: "validation", accessToken: "token", storeId: store.id },
  });

  const ctx = await unifiedContextService.getContext({ organizationId: org.id, storeId: store.id });
  if (!ctx) throw new Error("Expected unified context");
  if (ctx.dataQuality.issues.length > 0 && ctx.recentSignalCount === 0) {
    console.log("Unified context computed:", JSON.stringify(ctx, null, 2));
  }

  const graph = await knowledgeGraphService.query({ organizationId: org.id, storeId: store.id });
  if (graph.contentToProduct.length !== 0) throw new Error("Expected empty knowledge graph for new store");

  const product = await prisma.product.create({
    data: { externalId: "prod-369", title: "Validation Tee", inventory: 100, price: 2500, storeId: store.id },
  });
  const customer = await prisma.customer.create({
    data: { igUserId: "cust-369", username: "validation_customer", storeId: store.id },
  });

  const productFeatures = await featureService.getProductFeatures(org.id, store.id, product.externalId);
  if (productFeatures.demandScore <= 0) throw new Error("Expected positive demand score");

  const customerFeatures = await featureService.getCustomerFeatures(org.id, store.id, customer.igUserId ?? "cust-369");
  if (!["low", "medium", "high"].includes(customerFeatures.churnRisk)) throw new Error("Expected churn risk band");

  const workflow = await goalPlanGenerationService.createVersionedWorkflow("goal-1", org.id);
  if (workflow.status !== "draft") throw new Error("Expected draft workflow");

  const tested = await goalPlanGenerationService.testRun(workflow.workflowId, org.id);
  if (tested?.status !== "test") throw new Error("Expected test status");

  const launched = await goalPlanGenerationService.launchWithHoldout(workflow.workflowId, org.id, 10);
  if (launched?.status !== "live") throw new Error("Expected live status");

  const evidence = learningEvidenceService.getHierarchy();
  if (evidence.length < 4) throw new Error("Expected at least four learning evidence levels");

  const ops = modelOpsService.getModelOps();
  if (!ops.rollbackAvailable) throw new Error("Expected rollback available");

  const prediction = predictionPrioritizationService.scorePrediction({
    eventMatterScore: 0.9,
    interventionPossible: true,
    resultMeasurable: true,
    dataSufficient: true,
    errorCostManageable: true,
  });
  if (prediction.abstain) throw new Error("Expected prediction to proceed");

  const withheld = predictionPrioritizationService.scorePrediction({
    eventMatterScore: 0.1,
    interventionPossible: false,
    resultMeasurable: false,
    dataSufficient: false,
    errorCostManageable: false,
  });
  if (!withheld.abstain) throw new Error("Expected abstention");

  await intelligenceFeedbackService.submitRating({ insightId: "ins-1", userId: "u1", understood: true, hoursSaved: 1.5, falsePositive: false, falseNegative: false }, org.id);
  const feedbackKpis = await intelligenceFeedbackService.getKpis(org.id);
  if (feedbackKpis.total !== 1) throw new Error("Expected one feedback rating");

  const chartAccepted = chartAcceptanceService.evaluate({ id: "c1", title: "Revenue by channel", supportsDecision: "Decide next week's ad budget", decisionStatement: "Decide next week's ad budget" });
  if (!chartAccepted.accepted) throw new Error("Expected chart to be accepted");

  const chartRejected = chartAcceptanceService.evaluate({ id: "c2", title: "Signups by moon phase" });
  if (chartRejected.accepted) throw new Error("Expected chart to be rejected");

  const gate = await dataQualityGateService.check({ organizationId: org.id, storeId: store.id, priority: "high" });
  if (gate.ok) throw new Error("Expected data-quality gate to fail for empty store");

  console.log("TASK-369 validation passed");
  console.log(JSON.stringify({ ctx, graph, productFeatures, customerFeatures, launched, prediction, chartAccepted, gate }, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

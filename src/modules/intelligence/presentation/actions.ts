"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { customerDirectory } from "@/modules/crm";
import { conversationQueries } from "@/modules/conversations";
import {
  timelineService,
  customerSummaryService,
  entityResolutionService,
  dataQualityService,
  metricService,
  detectionService,
  intelligenceFeedService,
  recommendationService,
  recommendationLifecycleService,
  readModelRefresher,
  actionPlanService,
  goalService,
  predictionService,
  hypothesisService,
  businessLearningService,
  portfolioService,
  competitorIntelligenceService,
  costLatencyMonitor,
  nextBestActionService,
  goalAutomationService,
  kpiService,
  aiGovernanceService,
  qualityAssuranceService,
  rolloutService,
  riskMitigationRegistry,
  operatingModelService,
  unifiedContextService,
  knowledgeGraphService,
  featureService,
  goalPlanGenerationService,
  learningEvidenceService,
  modelOpsService,
  predictionPrioritizationService,
  intelligenceFeedbackService,
  intelligenceFeedInteractionService,
  chartAcceptanceService,
  updateMarketingMemory,
  generateDailyBrief,
  generateMarketingInsightsFromMemory,
} from "../infrastructure/container";
import { listTrackedCompetitorsAction } from "@/modules/analytics";

export interface IntelligenceActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

const metricSchema = z.object({
  name: z.string().min(1),
  storeId: z.string().optional(),
});

const linkIdSchema = z.object({
  linkId: z.string().min(1),
});

const mergeLinkSchema = z.object({
  linkId: z.string().min(1),
});

async function assertCustomerInOrg(
  organizationId: string | null,
  customerId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const customer = await customerDirectory.getCustomerDetail(organizationId, customerId);
  return !!customer;
}

export async function getCustomerTimelineAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { events: [] };
  const organizationId = user.organizationId;
  if (!(await assertCustomerInOrg(organizationId, customerId))) {
    return { events: [] };
  }

  const events = await timelineService.getTimeline({
    organizationId,
    subjectType: "customer",
    subjectId: customerId,
    includeLinked: true,
  });
  return { events };
}

export async function getCustomerIntelligenceAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { summary: null };
  const organizationId = user.organizationId;
  if (!(await assertCustomerInOrg(organizationId, customerId))) {
    return { summary: null };
  }

  const summary = await customerSummaryService.buildSummary({
    customerId,
    organizationId,
    getCustomerDetail: customerDirectory.getCustomerDetail.bind(customerDirectory),
    getLinkedEntities: entityResolutionService.getLinkedEntities.bind(entityResolutionService),
  });
  return { summary };
}

export async function getDataQualityIssuesAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { issues: [] };
  const organizationId = user.organizationId;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { issues: [] };
  }

  const definitions = await metricService.getDefinitions();
  await Promise.all(
    definitions.map((d) => dataQualityService.inspectMetric(d.name, organizationId, storeId ?? null)),
  );

  const issues = await dataQualityService.getOpenIssues(organizationId, storeId);
  return { issues };
}

export async function getMetricAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { error: "Unauthorized" };
  const organizationId = user.organizationId;

  const parsed = metricSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, storeId } = parsed.data;
  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) {
      return { error: "Store not found" };
    }
  }

  const snapshot = await metricService.getMetric(name, organizationId, storeId ?? null);
  return { snapshot };
}

export async function getIntelligenceFeedAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { insights: [] };
  const organizationId = user.organizationId;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { insights: [] };
  }

  const storeIds = storeId
    ? [storeId]
    : (await organizationQueries.getOrganizationOverview(organizationId))?.stores.map((s) => s.id) ?? [];

  await Promise.all(storeIds.map((id) => detectionService.analyzeStore(organizationId, id)));

  const insights = await intelligenceFeedService.getFeed(organizationId, storeId, 20);
  return { insights };
}

export async function dismissInsightAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z.object({ insightId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const insight = await intelligenceFeedService.dismiss(parsed.data.insightId);
  if (!insight || insight.organizationId !== user.organizationId) return;

  revalidatePath("/dashboard");
  if (insight.storeId) revalidatePath(`/stores/${insight.storeId}`);
}

export async function mergeEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const parsed = mergeLinkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId);
  if (!link || link.organizationId !== user.organizationId) return;

  await entityResolutionService.merge(parsed.data.linkId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function getRecommendationsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { recommendations: [] };
  const organizationId = user.organizationId;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { recommendations: [] };
  }

  await recommendationService.generateFromOpenInsights(organizationId, storeId);
  const recommendations = await recommendationService.listOpen(organizationId, storeId, 20);
  return { recommendations };
}

export async function getRecommendationConflictsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { conflicts: [] };
  const organizationId = user.organizationId;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { conflicts: [] };
  }

  const conflicts = await recommendationLifecycleService.getRecentConflicts(organizationId, storeId, 5);
  return { conflicts };
}

export async function refreshReadModelsAction(storeId?: string): Promise<{
  ok: boolean;
  result?: { insightsGenerated: number; recommendationsGenerated: number; ranked: number; expired: string[]; metricsRefreshed: number };
  error?: string;
}> {
  const user = await requireRole("ADMIN");
  if (!user.organizationId) return { ok: false, error: "Unauthorized" };
  const organizationId = user.organizationId;

  const overview = await organizationQueries.getOrganizationOverview(organizationId);
  const storeIds = storeId ? [storeId] : overview?.stores.map((s) => s.id) ?? [];
  if (storeId && !overview?.stores.some((s) => s.id === storeId)) return { ok: false, error: "Store not found" };

  try {
    const aggregate = { insightsGenerated: 0, recommendationsGenerated: 0, ranked: 0, expired: [] as string[], metricsRefreshed: 0 };
    for (const id of storeIds) {
      const result = await readModelRefresher.refreshStore(organizationId, id);
      aggregate.recommendationsGenerated += result.recommendationsGenerated;
      aggregate.ranked += result.ranked;
      aggregate.expired.push(...result.expired);
      aggregate.metricsRefreshed = Math.max(aggregate.metricsRefreshed, result.metricsRefreshed);
    }
    return { ok: true, result: aggregate };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return { ok: false, error: message };
  }
}

export async function approveRecommendationAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z.object({ recommendationId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const recommendation = await recommendationService.listOpen(user.organizationId).then((rs) => rs.find((r) => r.id === parsed.data.recommendationId));
  if (!recommendation || recommendation.organizationId !== user.organizationId) return;

  const plan = await actionPlanService.createFromRecommendation(recommendation.id, user.id);
  await actionPlanService.approve(plan.id, user.id, user.role);

  revalidatePath("/dashboard");
  if (plan.storeId) revalidatePath(`/stores/${plan.storeId}`);
}

export async function executeActionPlanAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z.object({ recommendationId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const recommendation = await recommendationService.listOpen(user.organizationId).then((rs) => rs.find((r) => r.id === parsed.data.recommendationId));
  if (!recommendation || recommendation.organizationId !== user.organizationId) return;

  const plan = await actionPlanService.createFromRecommendation(recommendation.id, user.id);
  await actionPlanService.approve(plan.id, user.id, user.role);
  await actionPlanService.execute(plan.id, user.id, user.role);
  revalidatePath("/dashboard");
  if (plan.storeId) revalidatePath(`/stores/${plan.storeId}`);
}

export async function dismissRecommendationAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z.object({ recommendationId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const recommendation = await recommendationService.listOpen(user.organizationId).then((rs) => rs.find((r) => r.id === parsed.data.recommendationId));
  if (!recommendation || recommendation.organizationId !== user.organizationId) return;

  await recommendationService.dismiss(recommendation.id);
  revalidatePath("/dashboard");
  if (recommendation.storeId) revalidatePath(`/stores/${recommendation.storeId}`);
}

export async function getGoalsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { goals: [] };

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { goals: [] };
  }

  const goals = await goalService.list(user.organizationId, storeId, 20);
  return { goals };
}

export async function createGoalAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const schema = z.object({
    storeId: z.string().optional(),
    name: z.string().min(1),
    targetMetric: z.string().min(1),
    target: z.coerce.number().optional(),
    endDate: z.coerce.date().optional(),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { storeId, name, targetMetric, target, endDate } = parsed.data;
  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return;
  }

  await goalService.create(user.organizationId, storeId, name, targetMetric, target ?? null, endDate ?? null, user.id);
  revalidatePath("/dashboard");
  if (storeId) revalidatePath(`/stores/${storeId}`);
}

export async function splitEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const parsed = linkIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId);
  if (!link || link.organizationId !== user.organizationId) return;

  await entityResolutionService.split(parsed.data.linkId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function getPredictionsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { predictions: [] };

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { predictions: [] };
  }

  await predictionService.generateForStore(user.organizationId, storeId);
  const predictions = await predictionService.listActive(user.organizationId, storeId, 20);
  return { predictions };
}

export async function getHypothesesAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { hypotheses: [] };

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { hypotheses: [] };
  }

  await hypothesisService.generateFromOpenInsights(user.organizationId, storeId);
  const hypotheses = await hypothesisService.list(user.organizationId, storeId, 20);
  return { hypotheses };
}

export async function getBusinessLearningAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { learning: [] };

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { learning: [] };
  }

  const learning = await businessLearningService.list(user.organizationId, storeId, 20);
  return { learning };
}

export async function getAgencyPortfolioAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { snapshot: null };

  const start = Date.now();
  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview) return { snapshot: null };

  for (const store of overview.stores) {
    await predictionService.generateForStore(user.organizationId, store.id);
  }

  await portfolioService.generateSnapshot(user.organizationId);
  const snapshot = await portfolioService.getLatest(user.organizationId);
  await costLatencyMonitor.record(user.organizationId, "getAgencyPortfolioAction", "intelligence", Date.now() - start, 0.1, "OK");
  return { snapshot };
}

export async function getCompetitorIntelligenceAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { insights: [] };

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { insights: [] };
  }

  const start = Date.now();
  const storeIds = storeId ? [storeId] : (await organizationQueries.getOrganizationOverview(user.organizationId))?.stores.map((s) => s.id) ?? [];

  for (const id of storeIds) {
    const accounts = await listTrackedCompetitorsAction(id);
    if (accounts.accounts && accounts.accounts.length > 0) {
      await competitorIntelligenceService.generateForStore(user.organizationId, id, accounts.accounts);
    }
  }

  const insights = await competitorIntelligenceService.list(user.organizationId, storeId, 20);
  await costLatencyMonitor.record(user.organizationId, "getCompetitorIntelligenceAction", "intelligence", Date.now() - start, 0.25, "OK");
  return { insights };
}

export async function getSystemHealthAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { summary: null };

  const summary = await costLatencyMonitor.summary(user.organizationId);
  return { summary };
}

export async function getInboxNextBestActionAction(conversationId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  const conversation = await conversationQueries.getConversation(conversationId);
  if (!conversation || !overview?.stores.some((s) => s.id === conversation.conversation.storeId)) {
    return { action: null };
  }

  const action = await nextBestActionService.forConversation(
    user.organizationId,
    conversation.conversation.storeId,
    conversationId,
  );
  return { action };
}

export async function getOrdersNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === storeId)) return { action: null };

  const action = await nextBestActionService.forStoreOrders(user.organizationId, storeId);
  return { action };
}

export async function getCrmNextBestActionAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const action = await nextBestActionService.forCrm(user.organizationId);
  return { action };
}

export async function getContentNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === storeId)) return { action: null };

  const action = await nextBestActionService.forContent(storeId);
  return { action };
}

export async function getCampaignsNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === storeId)) return { action: null };

  const action = await nextBestActionService.forCampaigns(storeId);
  return { action };
}

export async function getBrandDealsNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === storeId)) return { action: null };

  const action = await nextBestActionService.forBrandDeals(storeId);
  return { action };
}

export async function getCompetitorNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === storeId)) return { action: null };

  const action = await nextBestActionService.forCompetitorIntelligence(user.organizationId, storeId);
  return { action };
}

export async function getStoreMetricsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { metrics: [] };
  const organizationId = user.organizationId;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { metrics: [] };
  }

  const definitions = await metricService.getDefinitions();
  const storeIds = storeId
    ? [storeId]
    : (await organizationQueries.getOrganizationOverview(organizationId))?.stores.map((s) => s.id) ?? [];

  const metrics = await Promise.all(
    definitions.map(async (d) => {
      const snapshots = await Promise.all(
        storeIds.map((id) => metricService.getMetric(d.name, organizationId, id).catch(() => null)),
      );
      return { definition: d, snapshots: snapshots.filter(Boolean) };
    }),
  );

  return { metrics };
}

export async function getAutomationTemplatesAction() {
  const user = await getCurrentUser();
  if (!user) return { templates: [] };
  return { templates: goalAutomationService.listTemplates() };
}

const createGoalAutomationSchema = z.object({
  storeId: z.string().min(1),
  templateId: z.string().min(1),
  target: z.coerce.number().optional(),
  endDate: z.coerce.date().optional(),
  audienceEstimate: z.coerce.number().optional(),
  discountPct: z.coerce.number().optional(),
  consentConfirmed: z.coerce.boolean().optional(),
  daysSinceLastTouch: z.coerce.number().optional(),
  actionsPerDay: z.coerce.number().optional(),
});

export async function createGoalAutomationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createGoalAutomationSchema.safeParse({
    ...raw,
    target: raw.target ? Number(raw.target) : undefined,
    discountPct: raw.discountPct ? Number(raw.discountPct) : undefined,
    audienceEstimate: raw.audienceEstimate ? Number(raw.audienceEstimate) : undefined,
    daysSinceLastTouch: raw.daysSinceLastTouch ? Number(raw.daysSinceLastTouch) : undefined,
    actionsPerDay: raw.actionsPerDay ? Number(raw.actionsPerDay) : undefined,
    consentConfirmed: raw.consentConfirmed === "on" || raw.consentConfirmed === "true",
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? "Validation failed");

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === parsed.data.storeId)) {
    throw new Error("Unauthorized");
  }

  await goalAutomationService.createFromTemplate({
    organizationId: user.organizationId,
    ownerUserId: user.id,
    ...parsed.data,
  });
  revalidatePath(`/stores/${parsed.data.storeId}/automations`);
  revalidatePath(`/stores/${parsed.data.storeId}/automations/goals`);
}

export async function getWorkspaceKpisAction(storeId?: string, period: "24h" | "7d" | "30d" = "7d") {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return null;
  }

  return kpiService.getWorkspaceSnapshot(user.organizationId, storeId, period);
}

export async function formatAiResponseAction(input: {
  conclusion: string;
  evidencePeriod: string;
  likelyDrivers: string[];
  confidence: string;
  uncertainty: string;
  missingData: string[];
  recommendedAction: string;
  expectedResultRange: string;
  previewLink?: string | null;
}): Promise<{ rendered: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const response = aiGovernanceService.formatResponse(input);
  return { rendered: response.rendered };
}

const toolCallSchema = z.object({
  tool: z.string().min(1),
  params: z.record(z.unknown()),
  idempotencyKey: z.string().min(8),
});

export async function validateToolCallAction(formData: FormData): Promise<{ allowed: boolean; reason: string }> {
  const user = await getCurrentUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = toolCallSchema.safeParse({
    tool: raw.tool,
    params: JSON.parse(typeof raw.params === "string" ? raw.params : "{}"),
    idempotencyKey: raw.idempotencyKey,
  });
  if (!parsed.success) return { allowed: false, reason: parsed.error.errors[0]?.message ?? "Invalid tool call" };

  return aiGovernanceService.validateToolCall(parsed.data, user?.role ?? null);
}

export async function validateWorkflowAction(workflow: {
  name: string;
  nodes: Array<{
    id: string;
    actionType: string;
    goalEvent: string;
    entry: string[];
    exit: string[];
    suppressesDuplicates: boolean;
    suppressesAtSend: boolean;
  }>;
  estimatedAudience?: number;
  assumptions?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) return { valid: false, errors: ["Not authenticated"], warnings: [], estimatedAudience: null, assumptions: [] };
  return goalAutomationService.validateWorkflow(workflow);
}

export async function runQualityChecksAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === storeId)) return null;
  return qualityAssuranceService.runAll({ organizationId: user.organizationId, storeId, userId: user.id, userRole: user.role ?? "STAFF" });
}

export async function getRolloutGatesAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return rolloutService.getGates();
}

export async function setRolloutGateAction(name: string, enabled: boolean) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "STORE_OWNER")) return null;
  const gate = rolloutService.setGate(name as "SHADOW" | "INTERNAL" | "PILOT" | "BETA" | "GA", { enabled });
  return gate;
}

export async function getRiskMitigationsAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return riskMitigationRegistry.list();
}

export async function getOperatingModelAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return operatingModelService.getModel();
}

export async function getRiskMatrixAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return operatingModelService.getRiskMatrix();
}

export async function getUnifiedContextAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return unifiedContextService.getContext({ organizationId: user.organizationId, storeId });
}

export async function getKnowledgeGraphAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return knowledgeGraphService.query({ organizationId: user.organizationId, storeId });
}

export async function getFeatureProfileAction(type: "customer" | "product" | "content" | "campaign" | "business", id: string, storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  if (type === "customer") return featureService.getCustomerFeatures(user.organizationId, storeId ?? "", id);
  if (type === "product") return featureService.getProductFeatures(user.organizationId, storeId ?? "", id);
  if (type === "content") return featureService.getContentFeatures();
  if (type === "campaign") return featureService.getCampaignFeatures();
  return featureService.getBusinessFeatures(user.organizationId, storeId ?? "");
}

export async function createGoalPlanWorkflowAction(goalId: string) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return null;
  const plan = goalPlanGenerationService.createVersionedWorkflow(goalId);
  return plan;
}

export async function testGoalPlanWorkflowAction(workflowId: string) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return null;
  return goalPlanGenerationService.testRun(workflowId);
}

export async function launchGoalPlanWorkflowAction(workflowId: string, holdoutPct: number) {
  const user = await requireRole("ADMIN");
  if (!user.organizationId) return null;
  return goalPlanGenerationService.launchWithHoldout(workflowId, holdoutPct);
}

export async function getLearningEvidenceAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return learningEvidenceService.getHierarchy();
}

export async function getModelOpsAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return modelOpsService.getModelOps();
}

export async function evaluatePredictionPriorityAction(input: { eventMatterScore: number; interventionPossible: boolean; resultMeasurable: boolean; dataSufficient: boolean; errorCostManageable: boolean }) {
  const user = await getCurrentUser();
  if (!user) return null;
  return predictionPrioritizationService.scorePrediction(input);
}

export async function submitIntelligenceFeedbackAction(formData: FormData) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const insightId = String(formData.get("insightId") ?? "");
  const understood = formData.get("understood") === "true";
  const hoursSaved = Number(formData.get("hoursSaved") ?? 0);
  const falsePositive = formData.get("falsePositive") === "true";
  const falseNegative = formData.get("falseNegative") === "true";
  if (!insightId) return;
  intelligenceFeedbackService.submitRating({ insightId, userId: user.id, understood, hoursSaved, falsePositive, falseNegative });
  revalidatePath("/business-brain");
}

export async function getIntelligenceFeedbackKpisAction() {
  const user = await getCurrentUser();
  if (!user) return null;
  return intelligenceFeedbackService.getKpis();
}

export async function getInsightDrillDownAction(insightId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return intelligenceFeedInteractionService.getDrillDown(insightId);
}

export async function dismissInsightWithReasonAction(formData: FormData) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id) return;
  await intelligenceFeedInteractionService.dismissWithReason({ id, reason, userId: user.id });
  revalidatePath("/dashboard");
}

export async function evaluateChartAcceptanceAction(title: string, decisionStatement?: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return chartAcceptanceService.evaluate({ id: `chart-${Date.now()}`, title, decisionStatement, supportsDecision: decisionStatement });
}

export interface MarketingMemoryState {
  error?: string;
  memory?: Awaited<ReturnType<typeof updateMarketingMemory>>;
  brief?: Awaited<ReturnType<typeof generateDailyBrief>>;
}

const marketingMemorySchema = z.object({
  storeId: z.string().min(1),
});

export async function getMarketingMemoryAction(
  _prev: MarketingMemoryState,
  formData: FormData,
): Promise<MarketingMemoryState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { error: "You must be signed in to a workspace." };
  }

  const parsed = marketingMemorySchema.safeParse({
    storeId: formData.get("storeId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const overview = await organizationQueries.getOrganizationOverview(user.organizationId);
  if (!overview?.stores.some((s) => s.id === parsed.data.storeId)) {
    return { error: "Store not found in your organization." };
  }

  try {
    const memory = await updateMarketingMemory(user.organizationId, parsed.data.storeId);
    await generateMarketingInsightsFromMemory(memory);
    await recommendationService.generateFromOpenInsights(user.organizationId, parsed.data.storeId);
    const brief = await generateDailyBrief(user.organizationId, parsed.data.storeId, memory);
    return { memory, brief };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate marketing memory" };
  }
}

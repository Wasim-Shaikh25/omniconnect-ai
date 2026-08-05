"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getQueue } from "@/shared/queue";
import { getCurrentUser, requireRole, requireSuperAdmin, ForbiddenError, type SessionUser } from "@/modules/auth";
import { organizationQueries, tenantGuard } from "@/modules/workspaces";
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
  dailyActionService,
  journeyService,
  businessBrainContextService,
} from "../infrastructure/container";
import {
  INTELLIGENCE_QUEUE,
  JOB_REFRESH_READ_MODELS,
  JOB_REFRESH_PREDICTIONS,
} from "../infrastructure/queue-handlers";
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

/**
 * Resolves the effective store scope for the current user and validates it.
 * - Staff members are restricted to their assigned `user.storeId`.
 * - Owners/admins may request any store in their organization.
 * - When no store is requested, non-staff users can operate across all org stores.
 * Throws `ForbiddenError` when the requested store is outside the user's scope.
 */
async function resolveStoreScope(
  user: SessionUser,
  requestedStoreId?: string | null,
): Promise<string | null> {
  if (user.role === "STAFF") {
    if (!user.storeId) throw new ForbiddenError("No store assigned to staff user.");
    if (requestedStoreId && requestedStoreId !== user.storeId) throw new ForbiddenError();
    return user.storeId;
  }

  if (requestedStoreId) {
    await tenantGuard.assertStoreAccess(user, requestedStoreId);
    return requestedStoreId;
  }

  return null;
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

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { issues: [] };
  }

  const definitions = await metricService.getDefinitions();
  await Promise.all(
    definitions.map((d) => dataQualityService.inspectMetric(d.name, organizationId, effectiveStoreId)),
  );

  const issues = await dataQualityService.getOpenIssues(organizationId, effectiveStoreId ?? undefined);
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

  const { name, storeId: requestedStoreId } = parsed.data;
  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, requestedStoreId ?? null);
  } catch {
    return { error: "Store not found" };
  }

  const snapshot = await metricService.getMetric(name, organizationId, effectiveStoreId);
  return { snapshot };
}

export async function getIntelligenceFeedAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { insights: [] };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { insights: [] };
  }

  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(organizationId))?.stores.map((s) => s.id) ?? [];

  await Promise.all(storeIds.map((id) => detectionService.analyzeStore(organizationId, id)));

  const insights = await intelligenceFeedService.getFeed(organizationId, effectiveStoreId ?? undefined, 20);
  return { insights };
}

export async function dismissInsightAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z.object({ insightId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const insight = await intelligenceFeedService.dismiss(parsed.data.insightId, user.organizationId);
  if (!insight) return;

  revalidatePath("/dashboard");
  if (insight.storeId) revalidatePath(`/stores/${insight.storeId}`);
}

export async function mergeEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const parsed = mergeLinkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId, user.organizationId);
  if (!link) return;

  await entityResolutionService.merge(parsed.data.linkId, user.organizationId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function getRecommendationsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { recommendations: [] };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { recommendations: [] };
  }

  await recommendationService.generateFromOpenInsights(organizationId, effectiveStoreId ?? undefined);
  const recommendations = await recommendationService.listOpen(organizationId, effectiveStoreId ?? undefined, 20);
  return { recommendations };
}

export async function getRecommendationConflictsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { conflicts: [] };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { conflicts: [] };
  }

  const conflicts = await recommendationLifecycleService.getRecentConflicts(organizationId, effectiveStoreId ?? undefined, 5);
  return { conflicts };
}

export async function refreshReadModelsAction(storeId?: string): Promise<{
  ok: boolean;
  result?: { jobIds: string[] };
  error?: string;
}> {
  const user = await requireRole("ADMIN");
  if (!user.organizationId) return { ok: false, error: "Unauthorized" };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { ok: false, error: "Store not found" };
  }

  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(organizationId))?.stores.map((s) => s.id) ?? [];

  try {
    const queue = await getQueue(INTELLIGENCE_QUEUE);
    const jobIds: string[] = [];
    for (const id of storeIds) {
      const readJobId = await queue.add(JOB_REFRESH_READ_MODELS, { organizationId, storeId: id });
      const predictionJobId = await queue.add(JOB_REFRESH_PREDICTIONS, { organizationId, storeId: id });
      jobIds.push(readJobId, predictionJobId);
    }
    return { ok: true, result: { jobIds } };
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

  const plan = await actionPlanService.createFromRecommendation(recommendation.id, user.organizationId, user.id);
  await actionPlanService.approve(plan.id, user.organizationId, user.id, user.role);

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

  const plan = await actionPlanService.createFromRecommendation(recommendation.id, user.organizationId, user.id);
  await actionPlanService.approve(plan.id, user.organizationId, user.id, user.role);
  await actionPlanService.execute(plan.id, user.organizationId, user.id, user.role);
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

  await recommendationService.dismiss(recommendation.id, user.organizationId);
  revalidatePath("/dashboard");
  if (recommendation.storeId) revalidatePath(`/stores/${recommendation.storeId}`);
}

export async function getGoalsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { goals: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { goals: [] };
  }

  const goals = await goalService.list(user.organizationId, effectiveStoreId ?? undefined, 20);
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

  const { storeId: requestedStoreId, name, targetMetric, target, endDate } = parsed.data;
  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, requestedStoreId ?? null);
  } catch {
    return;
  }

  await goalService.create(user.organizationId, effectiveStoreId ?? undefined, name, targetMetric, target ?? null, endDate ?? null, user.id);
  revalidatePath("/dashboard");
  if (effectiveStoreId) revalidatePath(`/stores/${effectiveStoreId}`);
}

export async function splitEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const parsed = linkIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId, user.organizationId);
  if (!link) return;

  await entityResolutionService.split(parsed.data.linkId, user.organizationId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function getPredictionsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { predictions: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { predictions: [] };
  }

  await predictionService.generateForStore(user.organizationId, effectiveStoreId ?? undefined);
  const predictions = await predictionService.listActive(user.organizationId, effectiveStoreId ?? undefined, 20);
  return { predictions };
}

export async function getHypothesesAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { hypotheses: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { hypotheses: [] };
  }

  await hypothesisService.generateFromOpenInsights(user.organizationId, effectiveStoreId ?? undefined);
  const hypotheses = await hypothesisService.list(user.organizationId, effectiveStoreId ?? undefined, 20);
  return { hypotheses };
}

export async function getBusinessLearningAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { learning: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { learning: [] };
  }

  const learning = await businessLearningService.list(user.organizationId, effectiveStoreId ?? undefined, 20);
  return { learning };
}

export async function getAgencyPortfolioAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { snapshot: null };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, null);
  } catch {
    return { snapshot: null };
  }

  const start = Date.now();
  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(user.organizationId))?.stores.map((s) => s.id) ?? [];

  for (const id of storeIds) {
    await predictionService.generateForStore(user.organizationId, id);
  }

  await portfolioService.generateSnapshot(user.organizationId);
  const snapshot = await portfolioService.getLatest(user.organizationId);
  await costLatencyMonitor.record(user.organizationId, "getAgencyPortfolioAction", "intelligence", Date.now() - start, 0.1, "OK");
  return { snapshot };
}

export async function getCompetitorIntelligenceAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { insights: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { insights: [] };
  }

  const start = Date.now();
  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(user.organizationId))?.stores.map((s) => s.id) ?? [];

  for (const id of storeIds) {
    const accounts = await listTrackedCompetitorsAction(id);
    if (accounts.accounts && accounts.accounts.length > 0) {
      await competitorIntelligenceService.generateForStore(user.organizationId, id, accounts.accounts);
    }
  }

  const insights = await competitorIntelligenceService.list(user.organizationId, effectiveStoreId ?? undefined, 20);
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

  const conversation = await conversationQueries.getConversation(conversationId);
  if (!conversation) return { action: null };

  try {
    await resolveStoreScope(user, conversation.conversation.storeId);
  } catch {
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

  try {
    await resolveStoreScope(user, storeId);
  } catch {
    return { action: null };
  }

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

  try {
    await resolveStoreScope(user, storeId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forContent(storeId);
  return { action };
}

export async function getCampaignsNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  try {
    await resolveStoreScope(user, storeId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forCampaigns(storeId);
  return { action };
}

export async function getBrandDealsNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  try {
    await resolveStoreScope(user, storeId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forBrandDeals(storeId);
  return { action };
}

export async function getCompetitorNextBestActionAction(storeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { action: null };

  try {
    await resolveStoreScope(user, storeId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forCompetitorIntelligence(user.organizationId, storeId);
  return { action };
}

export async function getStoreMetricsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { metrics: [] };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { metrics: [] };
  }

  const definitions = await metricService.getDefinitions();
  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
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

  try {
    await resolveStoreScope(user, parsed.data.storeId);
  } catch {
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

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return null;
  }

  return kpiService.getWorkspaceSnapshot(user.organizationId, effectiveStoreId ?? undefined, period);
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
  try {
    await resolveStoreScope(user, storeId);
  } catch {
    return null;
  }
  return qualityAssuranceService.runAll({ organizationId: user.organizationId, storeId, userId: user.id, userRole: user.role ?? "STAFF" });
}

export async function getRolloutGatesAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return rolloutService.getGates(user.organizationId);
}

export async function setRolloutGateAction(name: string, enabled: boolean) {
  const user = await requireSuperAdmin();
  if (!user.organizationId) throw new Error("Super admin must belong to an organization to set rollout gates");
  const gate = await rolloutService.setGate(name as "SHADOW" | "INTERNAL" | "PILOT" | "BETA" | "GA", user.organizationId, { enabled });
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

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return null;
  }

  return unifiedContextService.getContext({ organizationId: user.organizationId, storeId: effectiveStoreId ?? undefined });
}

export async function getKnowledgeGraphAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return null;
  }

  return knowledgeGraphService.query({ organizationId: user.organizationId, storeId: effectiveStoreId ?? undefined });
}

export async function getFeatureProfileAction(type: "customer" | "product" | "content" | "campaign" | "business", id: string, storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return null;
  }

  const scopedStoreId = effectiveStoreId ?? "";
  if (type === "customer") return featureService.getCustomerFeatures(user.organizationId, scopedStoreId, id);
  if (type === "product") return featureService.getProductFeatures(user.organizationId, scopedStoreId, id);
  if (type === "content") return featureService.getContentFeatures();
  if (type === "campaign") return featureService.getCampaignFeatures();
  return featureService.getBusinessFeatures(user.organizationId, scopedStoreId);
}

export async function createGoalPlanWorkflowAction(goalId: string) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return null;
  const plan = await goalPlanGenerationService.createVersionedWorkflow(goalId, user.organizationId);
  return plan;
}

export async function testGoalPlanWorkflowAction(workflowId: string) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return null;
  return goalPlanGenerationService.testRun(workflowId, user.organizationId);
}

export async function launchGoalPlanWorkflowAction(workflowId: string, holdoutPct: number) {
  const user = await requireRole("ADMIN");
  if (!user.organizationId) return null;
  return goalPlanGenerationService.launchWithHoldout(workflowId, user.organizationId, holdoutPct);
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
  await intelligenceFeedbackService.submitRating({ insightId, userId: user.id, understood, hoursSaved, falsePositive, falseNegative }, user.organizationId);
  revalidatePath("/business-brain");
}

export async function getIntelligenceFeedbackKpisAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return intelligenceFeedbackService.getKpis(user.organizationId);
}

export async function getInsightDrillDownAction(insightId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return intelligenceFeedInteractionService.getDrillDown(insightId, user.organizationId);
}

export async function dismissInsightWithReasonAction(formData: FormData) {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id) return;
  await intelligenceFeedInteractionService.dismissWithReason({ id, organizationId: user.organizationId, reason, userId: user.id });
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

  let effectiveStoreId: string;
  try {
    effectiveStoreId = (await resolveStoreScope(user, parsed.data.storeId)) ?? parsed.data.storeId;
  } catch {
    return { error: "Store not found in your organization." };
  }

  try {
    const memory = await updateMarketingMemory(user.organizationId, effectiveStoreId);
    await generateMarketingInsightsFromMemory(memory);
    await recommendationService.generateFromOpenInsights(user.organizationId, effectiveStoreId);
    const brief = await generateDailyBrief(user.organizationId, effectiveStoreId, memory);
    return { memory, brief };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate marketing memory" };
  }
}

// ── Daily operating rhythm (spec 0050) ──────────────────────────────────────

export async function getTodayActionsAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { actions: [] };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { actions: [] };
  }

  const actions = await dailyActionService.listToday(organizationId, effectiveStoreId ?? undefined);
  return { actions };
}

export async function completeDailyActionAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z
    .object({ actionId: z.string().min(1), feedback: z.string().optional() })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  await dailyActionService.complete(parsed.data.actionId, parsed.data.feedback ?? null, user.organizationId);

  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function skipDailyActionAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;

  const parsed = z
    .object({ actionId: z.string().min(1), reason: z.string().optional() })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  await dailyActionService.skip(parsed.data.actionId, parsed.data.reason ?? null, user.organizationId);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function getJourneysAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { journeys: [] };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { journeys: [] };
  }

  const journeys = await journeyService.listJourneys(organizationId, effectiveStoreId ?? undefined, 50);
  return { journeys };
}

export async function getJourneyAction(journeyId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { journey: null };

  const journey = await journeyService.getJourney(journeyId, user.organizationId);
  if (!journey || journey.organizationId !== user.organizationId) return { journey: null };
  return { journey };
}

export async function getBusinessBrainContextAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { context: null };
  const organizationId = user.organizationId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, storeId ?? null);
  } catch {
    return { context: null };
  }

  const context = await businessBrainContextService.getContext(organizationId, effectiveStoreId ?? undefined);
  return { context };
}

export async function getRecommendationDetailAction(recommendationId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { recommendation: null };

  const recommendations = await recommendationService.listOpen(user.organizationId, undefined, 200);
  const recommendation = recommendations.find((r) => r.id === recommendationId) ?? null;
  if (!recommendation || recommendation.organizationId !== user.organizationId) return { recommendation: null };
  return { recommendation };
}

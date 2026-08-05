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
  projectId: z.string().optional(),
});

const linkIdSchema = z.object({
  linkId: z.string().min(1),
});

const mergeLinkSchema = z.object({
  linkId: z.string().min(1),
});

async function assertCustomerInOrg(
  userId: string | null,
  customerId: string,
): Promise<boolean> {
  if (!userId) return false;
  const customer = await customerDirectory.getCustomerDetail(userId, customerId);
  return !!customer;
}

/**
 * Resolves the effective store scope for the current user and validates it.
 * - Staff members are restricted to their assigned `user.projectId`.
 * - Owners/admins may request any store in their organization.
 * - When no store is requested, non-staff users can operate across all org stores.
 * Throws `ForbiddenError` when the requested store is outside the user's scope.
 */
async function resolveStoreScope(
  user: SessionUser,
  requestedStoreId?: string | null,
): Promise<string | null> {
  if (user.role === "USER") {
    if (!user.projectId) throw new ForbiddenError("No store assigned to staff user.");
    if (requestedStoreId && requestedStoreId !== user.projectId) throw new ForbiddenError();
    return user.projectId;
  }

  if (requestedStoreId) {
    await tenantGuard.assertStoreAccess(user, requestedStoreId);
    return requestedStoreId;
  }

  return null;
}

export async function getCustomerTimelineAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { events: [] };
  const userId = user.userId;
  if (!(await assertCustomerInOrg(userId, customerId))) {
    return { events: [] };
  }

  const events = await timelineService.getTimeline({
    userId,
    subjectType: "customer",
    subjectId: customerId,
    includeLinked: true,
  });
  return { events };
}

export async function getCustomerIntelligenceAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { summary: null };
  const userId = user.userId;
  if (!(await assertCustomerInOrg(userId, customerId))) {
    return { summary: null };
  }

  const summary = await customerSummaryService.buildSummary({
    customerId,
    userId,
    getCustomerDetail: customerDirectory.getCustomerDetail.bind(customerDirectory),
    getLinkedEntities: entityResolutionService.getLinkedEntities.bind(entityResolutionService),
  });
  return { summary };
}

export async function getDataQualityIssuesAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { issues: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { issues: [] };
  }

  const definitions = await metricService.getDefinitions();
  await Promise.all(
    definitions.map((d) => dataQualityService.inspectMetric(d.name, userId, effectiveStoreId)),
  );

  const issues = await dataQualityService.getOpenIssues(userId, effectiveStoreId ?? undefined);
  return { issues };
}

export async function getMetricAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { error: "Unauthorized" };
  const userId = user.userId;

  const parsed = metricSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, projectId: requestedStoreId } = parsed.data;
  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, requestedStoreId ?? null);
  } catch {
    return { error: "Store not found" };
  }

  const snapshot = await metricService.getMetric(name, userId, effectiveStoreId);
  return { snapshot };
}

export async function getIntelligenceFeedAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { insights: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { insights: [] };
  }

  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(userId))?.stores.map((s) => s.id) ?? [];

  await Promise.all(storeIds.map((id) => detectionService.analyzeStore(userId, id)));

  const insights = await intelligenceFeedService.getFeed(userId, effectiveStoreId ?? undefined, 20);
  return { insights };
}

export async function dismissInsightAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const parsed = z.object({ insightId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const insight = await intelligenceFeedService.dismiss(parsed.data.insightId, user.userId);
  if (!insight) return;

  revalidatePath("/dashboard");
  if (insight.projectId) revalidatePath(`/stores/${insight.projectId}`);
}

export async function mergeEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;
  const parsed = mergeLinkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId, user.userId);
  if (!link) return;

  await entityResolutionService.merge(parsed.data.linkId, user.userId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function getRecommendationsAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { recommendations: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { recommendations: [] };
  }

  await recommendationService.generateFromOpenInsights(userId, effectiveStoreId ?? undefined);
  const recommendations = await recommendationService.listOpen(userId, effectiveStoreId ?? undefined, 20);
  return { recommendations };
}

export async function getRecommendationConflictsAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { conflicts: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { conflicts: [] };
  }

  const conflicts = await recommendationLifecycleService.getRecentConflicts(userId, effectiveStoreId ?? undefined, 5);
  return { conflicts };
}

export async function refreshReadModelsAction(projectId?: string): Promise<{
  ok: boolean;
  result?: { jobIds: string[] };
  error?: string;
}> {
  const user = await requireRole("SUPER_ADMIN");
  if (!user.userId) return { ok: false, error: "Unauthorized" };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { ok: false, error: "Store not found" };
  }

  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(userId))?.stores.map((s) => s.id) ?? [];

  try {
    const queue = await getQueue(INTELLIGENCE_QUEUE);
    const jobIds: string[] = [];
    for (const id of storeIds) {
      const readJobId = await queue.add(JOB_REFRESH_READ_MODELS, { userId, projectId: id });
      const predictionJobId = await queue.add(JOB_REFRESH_PREDICTIONS, { userId, projectId: id });
      jobIds.push(readJobId, predictionJobId);
    }
    return { ok: true, result: { jobIds } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return { ok: false, error: message };
  }
}

export async function approveRecommendationAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const parsed = z.object({ recommendationId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const recommendation = await recommendationService.listOpen(user.userId).then((rs) => rs.find((r) => r.id === parsed.data.recommendationId));
  if (!recommendation || recommendation.userId !== user.userId) return;

  const plan = await actionPlanService.createFromRecommendation(recommendation.id, user.userId, user.id);
  await actionPlanService.approve(plan.id, user.userId, user.id, user.role);

  revalidatePath("/dashboard");
  if (plan.projectId) revalidatePath(`/stores/${plan.projectId}`);
}

export async function executeActionPlanAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const parsed = z.object({ recommendationId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const recommendation = await recommendationService.listOpen(user.userId).then((rs) => rs.find((r) => r.id === parsed.data.recommendationId));
  if (!recommendation || recommendation.userId !== user.userId) return;

  const plan = await actionPlanService.createFromRecommendation(recommendation.id, user.userId, user.id);
  await actionPlanService.approve(plan.id, user.userId, user.id, user.role);
  await actionPlanService.execute(plan.id, user.userId, user.id, user.role);
  revalidatePath("/dashboard");
  if (plan.projectId) revalidatePath(`/stores/${plan.projectId}`);
}

export async function dismissRecommendationAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const parsed = z.object({ recommendationId: z.string().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const recommendation = await recommendationService.listOpen(user.userId).then((rs) => rs.find((r) => r.id === parsed.data.recommendationId));
  if (!recommendation || recommendation.userId !== user.userId) return;

  await recommendationService.dismiss(recommendation.id, user.userId);
  revalidatePath("/dashboard");
  if (recommendation.projectId) revalidatePath(`/stores/${recommendation.projectId}`);
}

export async function getGoalsAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { goals: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { goals: [] };
  }

  const goals = await goalService.list(user.userId, effectiveStoreId ?? undefined, 20);
  return { goals };
}

export async function createGoalAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const schema = z.object({
    projectId: z.string().optional(),
    name: z.string().min(1),
    targetMetric: z.string().min(1),
    target: z.coerce.number().optional(),
    endDate: z.coerce.date().optional(),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { projectId: requestedStoreId, name, targetMetric, target, endDate } = parsed.data;
  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, requestedStoreId ?? null);
  } catch {
    return;
  }

  await goalService.create(user.userId, effectiveStoreId ?? undefined, name, targetMetric, target ?? null, endDate ?? null, user.id);
  revalidatePath("/dashboard");
  if (effectiveStoreId) revalidatePath(`/stores/${effectiveStoreId}`);
}

export async function splitEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;
  const parsed = linkIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId, user.userId);
  if (!link) return;

  await entityResolutionService.split(parsed.data.linkId, user.userId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function getPredictionsAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { predictions: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { predictions: [] };
  }

  await predictionService.generateForStore(user.userId, effectiveStoreId ?? undefined);
  const predictions = await predictionService.listActive(user.userId, effectiveStoreId ?? undefined, 20);
  return { predictions };
}

export async function getHypothesesAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { hypotheses: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { hypotheses: [] };
  }

  await hypothesisService.generateFromOpenInsights(user.userId, effectiveStoreId ?? undefined);
  const hypotheses = await hypothesisService.list(user.userId, effectiveStoreId ?? undefined, 20);
  return { hypotheses };
}

export async function getBusinessLearningAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { learning: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { learning: [] };
  }

  const learning = await businessLearningService.list(user.userId, effectiveStoreId ?? undefined, 20);
  return { learning };
}

export async function getAgencyPortfolioAction() {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { snapshot: null };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, null);
  } catch {
    return { snapshot: null };
  }

  const start = Date.now();
  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(user.userId))?.stores.map((s) => s.id) ?? [];

  for (const id of storeIds) {
    await predictionService.generateForStore(user.userId, id);
  }

  await portfolioService.generateSnapshot(user.userId);
  const snapshot = await portfolioService.getLatest(user.userId);
  await costLatencyMonitor.record(user.userId, "getAgencyPortfolioAction", "intelligence", Date.now() - start, 0.1, "OK");
  return { snapshot };
}

export async function getCompetitorIntelligenceAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { insights: [] };

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { insights: [] };
  }

  const start = Date.now();
  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(user.userId))?.stores.map((s) => s.id) ?? [];

  for (const id of storeIds) {
    const accounts = await listTrackedCompetitorsAction(id);
    if (accounts.accounts && accounts.accounts.length > 0) {
      await competitorIntelligenceService.generateForStore(user.userId, id, accounts.accounts);
    }
  }

  const insights = await competitorIntelligenceService.list(user.userId, effectiveStoreId ?? undefined, 20);
  await costLatencyMonitor.record(user.userId, "getCompetitorIntelligenceAction", "intelligence", Date.now() - start, 0.25, "OK");
  return { insights };
}

export async function getSystemHealthAction() {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { summary: null };

  const summary = await costLatencyMonitor.summary(user.userId);
  return { summary };
}

export async function getInboxNextBestActionAction(conversationId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  const conversation = await conversationQueries.getConversation(conversationId);
  if (!conversation) return { action: null };

  try {
    await resolveStoreScope(user, conversation.conversation.projectId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forConversation(
    user.userId,
    conversation.conversation.projectId,
    conversationId,
  );
  return { action };
}

export async function getOrdersNextBestActionAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  try {
    await resolveStoreScope(user, projectId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forStoreOrders(user.userId, projectId);
  return { action };
}

export async function getCrmNextBestActionAction() {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  const action = await nextBestActionService.forCrm(user.userId);
  return { action };
}

export async function getContentNextBestActionAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  try {
    await resolveStoreScope(user, projectId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forContent(projectId);
  return { action };
}

export async function getCampaignsNextBestActionAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  try {
    await resolveStoreScope(user, projectId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forCampaigns(projectId);
  return { action };
}

export async function getBrandDealsNextBestActionAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  try {
    await resolveStoreScope(user, projectId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forBrandDeals(projectId);
  return { action };
}

export async function getCompetitorNextBestActionAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { action: null };

  try {
    await resolveStoreScope(user, projectId);
  } catch {
    return { action: null };
  }

  const action = await nextBestActionService.forCompetitorIntelligence(user.userId, projectId);
  return { action };
}

export async function getStoreMetricsAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { metrics: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { metrics: [] };
  }

  const definitions = await metricService.getDefinitions();
  const storeIds = effectiveStoreId
    ? [effectiveStoreId]
    : (await organizationQueries.getOrganizationOverview(userId))?.stores.map((s) => s.id) ?? [];

  const metrics = await Promise.all(
    definitions.map(async (d) => {
      const snapshots = await Promise.all(
        storeIds.map((id) => metricService.getMetric(d.name, userId, id).catch(() => null)),
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
  projectId: z.string().min(1),
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
  if (!user || !user.userId) throw new Error("Not authenticated");

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
    await resolveStoreScope(user, parsed.data.projectId);
  } catch {
    throw new Error("Unauthorized");
  }

  await goalAutomationService.createFromTemplate({
    userId: user.userId,
    ownerUserId: user.id,
    ...parsed.data,
  });
  revalidatePath(`/stores/${parsed.data.projectId}/automations`);
  revalidatePath(`/stores/${parsed.data.projectId}/automations/goals`);
}

export async function getWorkspaceKpisAction(projectId?: string, period: "24h" | "7d" | "30d" = "7d") {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return null;
  }

  return kpiService.getWorkspaceSnapshot(user.userId, effectiveStoreId ?? undefined, period);
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

export async function runQualityChecksAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;
  try {
    await resolveStoreScope(user, projectId);
  } catch {
    return null;
  }
  return qualityAssuranceService.runAll({ userId: user.userId, projectId, userRole: user.role ?? "USER" });
}

export async function getRolloutGatesAction() {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;
  return rolloutService.getGates(user.userId);
}

export async function setRolloutGateAction(name: string, enabled: boolean) {
  const user = await requireSuperAdmin();
  if (!user.userId) throw new Error("Super admin must belong to an organization to set rollout gates");
  const gate = await rolloutService.setGate(name as "SHADOW" | "INTERNAL" | "PILOT" | "BETA" | "GA", user.userId, { enabled });
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

export async function getUnifiedContextAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return null;
  }

  return unifiedContextService.getContext({ userId: user.userId, projectId: effectiveStoreId ?? undefined });
}

export async function getKnowledgeGraphAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return null;
  }

  return knowledgeGraphService.query({ userId: user.userId, projectId: effectiveStoreId ?? undefined });
}

export async function getFeatureProfileAction(type: "customer" | "product" | "content" | "campaign" | "business", id: string, projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return null;
  }

  const scopedStoreId = effectiveStoreId ?? "";
  if (type === "customer") return featureService.getCustomerFeatures(user.userId, scopedStoreId, id);
  if (type === "product") return featureService.getProductFeatures(user.userId, scopedStoreId, id);
  if (type === "content") return featureService.getContentFeatures();
  if (type === "campaign") return featureService.getCampaignFeatures();
  return featureService.getBusinessFeatures(user.userId, scopedStoreId);
}

export async function createGoalPlanWorkflowAction(goalId: string) {
  const user = await requireRole("USER");
  if (!user.userId) return null;
  const plan = await goalPlanGenerationService.createVersionedWorkflow(goalId, user.userId);
  return plan;
}

export async function testGoalPlanWorkflowAction(workflowId: string) {
  const user = await requireRole("USER");
  if (!user.userId) return null;
  return goalPlanGenerationService.testRun(workflowId, user.userId);
}

export async function launchGoalPlanWorkflowAction(workflowId: string, holdoutPct: number) {
  const user = await requireRole("SUPER_ADMIN");
  if (!user.userId) return null;
  return goalPlanGenerationService.launchWithHoldout(workflowId, user.userId, holdoutPct);
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
  const user = await requireRole("USER");
  if (!user.userId) return;
  const insightId = String(formData.get("insightId") ?? "");
  const understood = formData.get("understood") === "true";
  const hoursSaved = Number(formData.get("hoursSaved") ?? 0);
  const falsePositive = formData.get("falsePositive") === "true";
  const falseNegative = formData.get("falseNegative") === "true";
  if (!insightId) return;
  await intelligenceFeedbackService.submitRating({ insightId, understood, hoursSaved, falsePositive, falseNegative }, user.userId);
  revalidatePath("/business-brain");
}

export async function getIntelligenceFeedbackKpisAction() {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;
  return intelligenceFeedbackService.getKpis(user.userId);
}

export async function getInsightDrillDownAction(insightId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return null;
  return intelligenceFeedInteractionService.getDrillDown(insightId, user.userId);
}

export async function dismissInsightWithReasonAction(formData: FormData) {
  const user = await requireRole("USER");
  if (!user.userId) return;
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id) return;
  await intelligenceFeedInteractionService.dismissWithReason({ id, userId: user.userId, reason });
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
  projectId: z.string().min(1),
});

export async function getMarketingMemoryAction(
  _prev: MarketingMemoryState,
  formData: FormData,
): Promise<MarketingMemoryState> {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return { error: "You must be signed in to a workspace." };
  }

  const parsed = marketingMemorySchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let effectiveStoreId: string;
  try {
    effectiveStoreId = (await resolveStoreScope(user, parsed.data.projectId)) ?? parsed.data.projectId;
  } catch {
    return { error: "Store not found in your organization." };
  }

  try {
    const memory = await updateMarketingMemory(user.userId, effectiveStoreId);
    await generateMarketingInsightsFromMemory(memory);
    await recommendationService.generateFromOpenInsights(user.userId, effectiveStoreId);
    const brief = await generateDailyBrief(user.userId, effectiveStoreId, memory);
    return { memory, brief };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate marketing memory" };
  }
}

// ── Daily operating rhythm (spec 0050) ──────────────────────────────────────

export async function getTodayActionsAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { actions: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { actions: [] };
  }

  const actions = await dailyActionService.listToday(userId, effectiveStoreId ?? undefined);
  return { actions };
}

export async function completeDailyActionAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const parsed = z
    .object({ actionId: z.string().min(1), feedback: z.string().optional() })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  await dailyActionService.complete(parsed.data.actionId, parsed.data.feedback ?? null, user.userId);

  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function skipDailyActionAction(formData: FormData): Promise<void> {
  const user = await requireRole("USER");
  if (!user.userId) return;

  const parsed = z
    .object({ actionId: z.string().min(1), reason: z.string().optional() })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  await dailyActionService.skip(parsed.data.actionId, parsed.data.reason ?? null, user.userId);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function getJourneysAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { journeys: [] };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { journeys: [] };
  }

  const journeys = await journeyService.listJourneys(userId, effectiveStoreId ?? undefined, 50);
  return { journeys };
}

export async function getJourneyAction(journeyId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { journey: null };

  const journey = await journeyService.getJourney(journeyId, user.userId);
  if (!journey || journey.userId !== user.userId) return { journey: null };
  return { journey };
}

export async function getBusinessBrainContextAction(projectId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { context: null };
  const userId = user.userId;

  let effectiveStoreId: string | null;
  try {
    effectiveStoreId = await resolveStoreScope(user, projectId ?? null);
  } catch {
    return { context: null };
  }

  const context = await businessBrainContextService.getContext(userId, effectiveStoreId ?? undefined);
  return { context };
}

export async function getRecommendationDetailAction(recommendationId: string) {
  const user = await getCurrentUser();
  if (!user || !user.userId) return { recommendation: null };

  const recommendations = await recommendationService.listOpen(user.userId, undefined, 200);
  const recommendation = recommendations.find((r) => r.id === recommendationId) ?? null;
  if (!recommendation || recommendation.userId !== user.userId) return { recommendation: null };
  return { recommendation };
}

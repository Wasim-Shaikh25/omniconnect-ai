import type {
  SignalRecord,
  EntityLinkRecord,
  DataQualityIssueRecord,
  MetricDefinitionRecord,
  MetricSnapshotRecord,
  BusinessInsightRecord,
  RecommendationRecord,
  ActionPlanRecord,
  DecisionRecord,
  OutcomeRecord,
  GoalRecord,
  PredictionRecord,
  HypothesisRecord,
  BusinessLearningRecord,
  CompetitorInsightRecord,
  PortfolioSnapshotRecord,
  SystemMetricRecord,
  RecommendationConflictRecord,
  RecommendationStatus,
  ActionPlanStatus,
  DecisionType,
  OutcomeStatus,
  GoalStatus,
  PredictionType,
  PredictionStatus,
  HypothesisStatus,
  ConfidenceLevel,
  LinkStatus,
  DataQualityStatus,
  DataQualitySeverity,
  MetricSnapshotStatus,
  InsightType,
  InsightSeverity,
  InsightStatus,
  RiskTier,
  BusinessObjective,
  DailyActionRecord,
  DailyActionStatus,
  ActionOutcomeRecord,
  ActionOutcomeStatus,
  JourneyRecord,
  JourneyStepRecord,
  JourneyOutcome,
  IntelligenceFeedbackRecord,
  IntelligenceDismissalRecord,
  GoalPlanRecord,
  GoalPlanStatus,
  GoalPlanPostLaunchRecommendation,
  RolloutMode,
  RolloutGateRecord,
} from "../domain/types";

export interface SignalRepository {
  save(signal: Omit<SignalRecord, "id" | "createdAt">): Promise<SignalRecord>;
  listBySubject(
    userId: string,
    subjectType: string,
    subjectId: string,
    limit?: number,
  ): Promise<SignalRecord[]>;
  listByStore(
    projectId: string,
    limit?: number,
  ): Promise<SignalRecord[]>;
  getLatestBySubject(
    userId: string,
    subjectType: string,
    subjectId: string,
    eventType: string,
  ): Promise<SignalRecord | null>;

  listByRelatedEntity(
    userId: string,
    entityType: string,
    entityId: string,
    limit?: number,
  ): Promise<SignalRecord[]>;
}

export interface EntityLinkRepository {
  save(link: Omit<EntityLinkRecord, "id" | "createdAt" | "updatedAt">): Promise<EntityLinkRecord>;
  findByEntity(
    userId: string,
    entityType: string,
    entityId: string,
    activeOnly?: boolean,
    limit?: number,
  ): Promise<EntityLinkRecord[]>;
  listForOrganization(userId: string, limit?: number): Promise<EntityLinkRecord[]>;
  findBetween(
    userId: string,
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityLinkRecord | null>;
  findById(id: string, userId?: string): Promise<EntityLinkRecord | null>;
  updateStatus(id: string, userId: string, status: LinkStatus): Promise<EntityLinkRecord>;
  updateConfidence(id: string, userId: string, confidence: ConfidenceLevel, resolutionMethod: string): Promise<EntityLinkRecord>;
}

export interface DataQualityRepository {
  save(issue: Omit<DataQualityIssueRecord, "id" | "detectedAt" | "resolvedAt">): Promise<DataQualityIssueRecord>;
  listOpen(userId: string, projectId?: string, limit?: number): Promise<DataQualityIssueRecord[]>;
  listByStore(projectId: string, limit?: number): Promise<DataQualityIssueRecord[]>;
  findById(id: string, userId: string): Promise<DataQualityIssueRecord | null>;
  updateStatus(id: string, userId: string, status: DataQualityStatus): Promise<DataQualityIssueRecord>;
}

export interface MetricRepository {
  saveDefinition(def: Omit<MetricDefinitionRecord, "id" | "createdAt" | "updatedAt">): Promise<MetricDefinitionRecord>;
  findDefinition(userId: string | null, name: string): Promise<MetricDefinitionRecord | null>;
  listDefinitions(userId: string | null, limit?: number): Promise<MetricDefinitionRecord[]>;
  saveSnapshot(snapshot: Omit<MetricSnapshotRecord, "id" | "computedAt">): Promise<MetricSnapshotRecord>;
  getLatestSnapshot(
    definitionId: string,
    userId: string,
    projectId: string | null,
  ): Promise<MetricSnapshotRecord | null>;
}

export interface BusinessInsightRepository {
  save(insight: Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt">): Promise<BusinessInsightRecord>;
  listOpen(userId: string, projectId?: string, limit?: number): Promise<BusinessInsightRecord[]>;
  findById(id: string, userId?: string): Promise<BusinessInsightRecord | null>;
  updateStatus(id: string, userId: string, status: InsightStatus): Promise<BusinessInsightRecord>;
}

export interface RecommendationRepository {
  save(rec: Omit<RecommendationRecord, "id" | "createdAt" | "updatedAt">): Promise<RecommendationRecord>;
  listOpen(userId: string, projectId?: string, limit?: number): Promise<RecommendationRecord[]>;
  listActive(userId: string, projectId?: string, limit?: number): Promise<RecommendationRecord[]>;
  findById(id: string, userId: string): Promise<RecommendationRecord | null>;
  updateStatus(id: string, userId: string, status: RecommendationStatus): Promise<RecommendationRecord>;
  updateObjective(id: string, userId: string, objective: BusinessObjective, reason: string): Promise<RecommendationRecord | null>;
  updateConfidence(id: string, userId: string, confidence: number, signals: number): Promise<RecommendationRecord | null>;
  invalidate(id: string, userId: string, eventName: string): Promise<RecommendationRecord>;
}

export interface DailyActionRepository {
  save(action: Omit<DailyActionRecord, "id" | "createdAt" | "updatedAt">): Promise<DailyActionRecord>;
  listPending(userId: string, projectId?: string, limit?: number): Promise<DailyActionRecord[]>;
  listForDate(userId: string, since: Date, projectId?: string, limit?: number): Promise<DailyActionRecord[]>;
  findById(id: string, userId?: string): Promise<DailyActionRecord | null>;
  complete(id: string, userId: string, feedback: string | null, outcomeId: string | null): Promise<DailyActionRecord>;
  skip(id: string, userId: string, reason: string | null): Promise<DailyActionRecord>;
  setOutcome(id: string, userId: string, outcomeId: string): Promise<DailyActionRecord>;
}

export interface ActionOutcomeRepository {
  save(outcome: Omit<ActionOutcomeRecord, "id" | "createdAt" | "updatedAt">): Promise<ActionOutcomeRecord>;
  findByAction(actionId: string, userId: string): Promise<ActionOutcomeRecord | null>;
  findById(id: string, userId: string): Promise<ActionOutcomeRecord | null>;
  updateMeasured(
    id: string,
    userId: string,
    metricAfter: unknown,
    status: ActionOutcomeStatus,
    measuredAt: Date,
  ): Promise<ActionOutcomeRecord>;
  listPendingDue(userId: string, projectId?: string, limit?: number): Promise<ActionOutcomeRecord[]>;
}

export interface AppendTouchpointInput {
  userId: string;
  projectId: string;
  customerId?: string | null;
  externalUserId?: string | null;
  channel?: string | null;
  step: {
    type: JourneyStepRecord["type"];
    externalId?: string | null;
    channel?: string | null;
    details?: unknown;
    occurredAt?: Date;
  };
  outcome?: JourneyOutcome;
  attributedRevenue?: number | null;
  attributedPostId?: string | null;
}

export interface JourneyRepository {
  findOpen(
    userId: string,
    projectId: string,
    key: { customerId?: string | null; externalUserId?: string | null },
  ): Promise<JourneyRecord | null>;
  create(journey: {
    userId: string;
    projectId: string;
    customerId: string | null;
    externalUserId: string | null;
    channel: string | null;
    outcome: JourneyOutcome;
  }): Promise<JourneyRecord>;
  appendStep(
    journeyId: string,
    userId: string,
    step: Omit<JourneyStepRecord, "id" | "journeyId" | "createdAt">,
    update: { outcome?: JourneyOutcome; attributedRevenue?: number | null; attributedPostId?: string | null },
  ): Promise<JourneyRecord>;
  findById(id: string, userId: string): Promise<JourneyRecord | null>;
  list(userId: string, projectId?: string, limit?: number): Promise<JourneyRecord[]>;
  search(
    userId: string,
    query: { projectId?: string; externalUserId?: string; customerId?: string; postId?: string; couponCode?: string },
    limit?: number,
  ): Promise<JourneyRecord[]>;
}

export interface ActionPlanRepository {
  save(plan: Omit<ActionPlanRecord, "id" | "createdAt" | "updatedAt">): Promise<ActionPlanRecord>;
  findById(id: string, userId: string): Promise<ActionPlanRecord | null>;
  updateStatus(id: string, userId: string, status: ActionPlanStatus, approvedBy?: string | null, executedAt?: Date | null, stoppedAt?: Date | null): Promise<ActionPlanRecord>;
}

export interface DecisionRepository {
  save(decision: Omit<DecisionRecord, "id" | "createdAt" | "updatedAt">): Promise<DecisionRecord>;
  listByActionPlan(actionPlanId: string, limit?: number): Promise<DecisionRecord[]>;
}

export interface OutcomeRepository {
  save(outcome: Omit<OutcomeRecord, "id" | "createdAt" | "updatedAt">): Promise<OutcomeRecord>;
  findByActionPlan(actionPlanId: string, userId: string): Promise<OutcomeRecord | null>;
  findById(id: string, userId: string): Promise<OutcomeRecord | null>;
  list(userId: string, projectId?: string, limit?: number): Promise<OutcomeRecord[]>;
  updateMeasured(id: string, userId: string, beforeValue: number | null, afterValue: number | null, status: OutcomeStatus, measuredAt: Date): Promise<OutcomeRecord>;
}

export interface GoalRepository {
  save(goal: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">): Promise<GoalRecord>;
  list(userId: string, projectId?: string, limit?: number): Promise<GoalRecord[]>;
  findById(id: string, userId: string): Promise<GoalRecord | null>;
  updatePacing(id: string, userId: string, pacing: GoalRecord["pacing"], status?: GoalStatus): Promise<GoalRecord>;
}

export interface PredictionRepository {
  save(prediction: Omit<PredictionRecord, "id" | "createdAt" | "updatedAt">): Promise<PredictionRecord>;
  listActive(userId: string, projectId?: string, limit?: number): Promise<PredictionRecord[]>;
  findById(id: string, userId: string): Promise<PredictionRecord | null>;
  expire(id: string, userId: string): Promise<PredictionRecord>;
}

export interface HypothesisRepository {
  save(hypothesis: Omit<HypothesisRecord, "id" | "createdAt" | "updatedAt">): Promise<HypothesisRecord>;
  list(userId: string, projectId?: string, limit?: number): Promise<HypothesisRecord[]>;
  findById(id: string, userId: string): Promise<HypothesisRecord | null>;
  updateStatus(id: string, userId: string, status: HypothesisStatus, validatedAt?: Date | null): Promise<HypothesisRecord>;
}

export interface BusinessLearningRepository {
  save(record: Omit<BusinessLearningRecord, "id" | "createdAt" | "updatedAt">): Promise<BusinessLearningRecord>;
  findByRule(userId: string, ruleName: string, projectId?: string): Promise<BusinessLearningRecord | null>;
  findById(id: string, userId: string): Promise<BusinessLearningRecord | null>;
  list(userId: string, projectId?: string, limit?: number): Promise<BusinessLearningRecord[]>;
  updateOutcome(id: string, userId: string, success: boolean, weightDelta: number, lastOutcomeAt: Date): Promise<BusinessLearningRecord>;
}

export interface CompetitorInsightRepository {
  save(insight: Omit<CompetitorInsightRecord, "id" | "createdAt" | "updatedAt">): Promise<CompetitorInsightRecord>;
  list(userId: string, projectId?: string, limit?: number): Promise<CompetitorInsightRecord[]>;
  findById(id: string, userId: string): Promise<CompetitorInsightRecord | null>;
}

export interface IntelligenceFeedbackRepository {
  save(
    record: Omit<IntelligenceFeedbackRecord, "id" | "userId" | "createdAt">,
    userId: string,
  ): Promise<IntelligenceFeedbackRecord>;
  getKpis(userId: string): Promise<{ total: number; understoodRate: number; hoursSaved: number; falsePositiveRate: number; falseNegativeRate: number }>;
}

export interface IntelligenceDismissalRepository {
  dismiss(input: { insightId: string; userId: string; userId: string; reason: string }): Promise<IntelligenceDismissalRecord>;
  getReason(insightId: string, userId: string): Promise<string | null>;
}

export interface GoalPlanRepository {
  create(goalId: string, userId: string): Promise<GoalPlanRecord>;
  testRun(workflowId: string, userId: string): Promise<GoalPlanRecord | null>;
  launchWithHoldout(workflowId: string, userId: string, holdoutPct: number): Promise<GoalPlanRecord | null>;
  getPlan(workflowId: string, userId: string): Promise<GoalPlanRecord | null>;
  postLaunch(workflowId: string, userId: string, recommendation: GoalPlanPostLaunchRecommendation): Promise<GoalPlanRecord | null>;
}

export interface RolloutGateRepository {
  getGates(userId: string): Promise<RolloutGateRecord[]>;
  getGate(name: RolloutMode, userId: string): Promise<RolloutGateRecord | null>;
  setGate(name: RolloutMode, userId: string, enabled: boolean): Promise<RolloutGateRecord>;
}

export interface PortfolioSnapshotRepository {
  save(snapshot: Omit<PortfolioSnapshotRecord, "id" | "createdAt" | "updatedAt">): Promise<PortfolioSnapshotRecord>;
  findLatest(userId: string): Promise<PortfolioSnapshotRecord | null>;
  list(userId: string, limit?: number): Promise<PortfolioSnapshotRecord[]>;
}

export interface SystemMetricRepository {
  save(metric: Omit<SystemMetricRecord, "id" | "createdAt" | "updatedAt">): Promise<SystemMetricRecord>;
  list(userId: string, operation?: string, limit?: number): Promise<SystemMetricRecord[]>;
  summary(userId: string): Promise<{ avgLatencyMs: number | null; totalCostCents: number | null; operationCount: number; slowestOperation: string | null }>;
}

export interface KpiSnapshot {
  userId: string;
  projectId?: string;
  period: "24h" | "7d" | "30d";
  iava: number;
  insightsGenerated: number;
  insightsActed: number;
  recommendationsAccepted: number;
  recommendationsDismissed: number;
  actionPlansExecuted: number;
  actionPlansSuccess: number;
  outcomesLinked: number;
  signalFreshnessPct: number;
  identityConfidenceAvg: number | null;
  highConfidenceEntityLinks: number;
}

export interface KpiRepository {
  getWorkspaceSnapshot(userId: string, projectId: string | null, period: KpiSnapshot["period"], now?: Date): Promise<KpiSnapshot>;
}

export interface ActionExecutor {
  execute(actionType: string, params: unknown): Promise<{ ok: boolean; message?: string }>;
}

export interface RecommendationConflictRepository {
  save(conflict: Omit<RecommendationConflictRecord, "id" | "resolvedAt">): Promise<RecommendationConflictRecord>;
  listRecent(userId: string, projectId?: string, limit?: number): Promise<RecommendationConflictRecord[]>;
}

export type {
  SignalRecord,
  EntityLinkRecord,
  DataQualityIssueRecord,
  MetricDefinitionRecord,
  MetricSnapshotRecord,
  BusinessInsightRecord,
  RecommendationRecord,
  ActionPlanRecord,
  DecisionRecord,
  OutcomeRecord,
  GoalRecord,
  PredictionRecord,
  HypothesisRecord,
  BusinessLearningRecord,
  CompetitorInsightRecord,
  PortfolioSnapshotRecord,
  SystemMetricRecord,
  RecommendationConflictRecord,
  RecommendationStatus,
  ActionPlanStatus,
  DecisionType,
  OutcomeStatus,
  GoalStatus,
  PredictionType,
  PredictionStatus,
  HypothesisStatus,
  ConfidenceLevel,
  LinkStatus,
  DataQualityStatus,
  DataQualitySeverity,
  MetricSnapshotStatus,
  InsightType,
  InsightSeverity,
  InsightStatus,
  RiskTier,
  BusinessObjective,
  DailyActionRecord,
  DailyActionStatus,
  ActionOutcomeRecord,
  ActionOutcomeStatus,
  JourneyRecord,
  JourneyStepRecord,
  JourneyOutcome,
  IntelligenceFeedbackRecord,
  IntelligenceDismissalRecord,
  GoalPlanRecord,
  GoalPlanStatus,
  GoalPlanPostLaunchRecommendation,
  RolloutMode,
  RolloutGateRecord,
};

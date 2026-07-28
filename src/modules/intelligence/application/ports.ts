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
} from "../domain/types";

export interface SignalRepository {
  save(signal: Omit<SignalRecord, "id" | "createdAt">): Promise<SignalRecord>;
  listBySubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
    limit?: number,
  ): Promise<SignalRecord[]>;
  listByStore(
    storeId: string,
    limit?: number,
  ): Promise<SignalRecord[]>;
  getLatestBySubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
    eventType: string,
  ): Promise<SignalRecord | null>;

  listByRelatedEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    limit?: number,
  ): Promise<SignalRecord[]>;
}

export interface EntityLinkRepository {
  save(link: Omit<EntityLinkRecord, "id" | "createdAt" | "updatedAt">): Promise<EntityLinkRecord>;
  findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    activeOnly?: boolean,
  ): Promise<EntityLinkRecord[]>;
  listForOrganization(organizationId: string, limit?: number): Promise<EntityLinkRecord[]>;
  findBetween(
    organizationId: string,
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityLinkRecord | null>;
  findById(id: string, organizationId?: string): Promise<EntityLinkRecord | null>;
  updateStatus(id: string, organizationId: string, status: LinkStatus): Promise<EntityLinkRecord>;
  updateConfidence(id: string, organizationId: string, confidence: ConfidenceLevel, resolutionMethod: string): Promise<EntityLinkRecord>;
}

export interface DataQualityRepository {
  save(issue: Omit<DataQualityIssueRecord, "id" | "detectedAt" | "resolvedAt">): Promise<DataQualityIssueRecord>;
  listOpen(organizationId: string, storeId?: string): Promise<DataQualityIssueRecord[]>;
  listByStore(storeId: string, limit?: number): Promise<DataQualityIssueRecord[]>;
  updateStatus(id: string, status: DataQualityStatus): Promise<DataQualityIssueRecord>;
}

export interface MetricRepository {
  saveDefinition(def: Omit<MetricDefinitionRecord, "id" | "createdAt" | "updatedAt">): Promise<MetricDefinitionRecord>;
  findDefinition(organizationId: string | null, name: string): Promise<MetricDefinitionRecord | null>;
  listDefinitions(organizationId: string | null): Promise<MetricDefinitionRecord[]>;
  saveSnapshot(snapshot: Omit<MetricSnapshotRecord, "id" | "computedAt">): Promise<MetricSnapshotRecord>;
  getLatestSnapshot(
    definitionId: string,
    organizationId: string,
    storeId: string | null,
  ): Promise<MetricSnapshotRecord | null>;
}

export interface BusinessInsightRepository {
  save(insight: Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt">): Promise<BusinessInsightRecord>;
  listOpen(organizationId: string, storeId?: string, limit?: number): Promise<BusinessInsightRecord[]>;
  findById(id: string, organizationId?: string): Promise<BusinessInsightRecord | null>;
  updateStatus(id: string, organizationId: string, status: InsightStatus): Promise<BusinessInsightRecord>;
}

export interface RecommendationRepository {
  save(rec: Omit<RecommendationRecord, "id" | "createdAt" | "updatedAt">): Promise<RecommendationRecord>;
  listOpen(organizationId: string, storeId?: string, limit?: number): Promise<RecommendationRecord[]>;
  listActive(organizationId: string, storeId?: string, limit?: number): Promise<RecommendationRecord[]>;
  findById(id: string): Promise<RecommendationRecord | null>;
  updateStatus(id: string, status: RecommendationStatus): Promise<RecommendationRecord>;
  updateObjective(id: string, objective: BusinessObjective, reason: string): Promise<RecommendationRecord | null>;
  updateConfidence(id: string, confidence: number, signals: number): Promise<RecommendationRecord | null>;
  invalidate(id: string, eventName: string): Promise<RecommendationRecord>;
}

export interface DailyActionRepository {
  save(action: Omit<DailyActionRecord, "id" | "createdAt" | "updatedAt">): Promise<DailyActionRecord>;
  listPending(organizationId: string, storeId?: string, limit?: number): Promise<DailyActionRecord[]>;
  listForDate(organizationId: string, since: Date, storeId?: string, limit?: number): Promise<DailyActionRecord[]>;
  findById(id: string, organizationId?: string): Promise<DailyActionRecord | null>;
  complete(id: string, organizationId: string, feedback: string | null, outcomeId: string | null): Promise<DailyActionRecord>;
  skip(id: string, organizationId: string, reason: string | null): Promise<DailyActionRecord>;
  setOutcome(id: string, organizationId: string, outcomeId: string): Promise<DailyActionRecord>;
}

export interface ActionOutcomeRepository {
  save(outcome: Omit<ActionOutcomeRecord, "id" | "createdAt" | "updatedAt">): Promise<ActionOutcomeRecord>;
  findByAction(actionId: string): Promise<ActionOutcomeRecord | null>;
  findById(id: string): Promise<ActionOutcomeRecord | null>;
  updateMeasured(
    id: string,
    metricAfter: unknown,
    status: ActionOutcomeStatus,
    measuredAt: Date,
  ): Promise<ActionOutcomeRecord>;
  listPendingDue(organizationId: string, storeId?: string, limit?: number): Promise<ActionOutcomeRecord[]>;
}

export interface AppendTouchpointInput {
  organizationId: string;
  storeId: string;
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
    organizationId: string,
    storeId: string,
    key: { customerId?: string | null; externalUserId?: string | null },
  ): Promise<JourneyRecord | null>;
  create(journey: {
    organizationId: string;
    storeId: string;
    customerId: string | null;
    externalUserId: string | null;
    channel: string | null;
    outcome: JourneyOutcome;
  }): Promise<JourneyRecord>;
  appendStep(
    journeyId: string,
    step: Omit<JourneyStepRecord, "id" | "journeyId" | "createdAt">,
    update: { outcome?: JourneyOutcome; attributedRevenue?: number | null; attributedPostId?: string | null },
  ): Promise<JourneyRecord>;
  findById(id: string): Promise<JourneyRecord | null>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<JourneyRecord[]>;
  search(
    organizationId: string,
    query: { storeId?: string; externalUserId?: string; customerId?: string; postId?: string; couponCode?: string },
    limit?: number,
  ): Promise<JourneyRecord[]>;
}

export interface ActionPlanRepository {
  save(plan: Omit<ActionPlanRecord, "id" | "createdAt" | "updatedAt">): Promise<ActionPlanRecord>;
  findById(id: string): Promise<ActionPlanRecord | null>;
  updateStatus(id: string, status: ActionPlanStatus, approvedBy?: string | null, executedAt?: Date | null, stoppedAt?: Date | null): Promise<ActionPlanRecord>;
}

export interface DecisionRepository {
  save(decision: Omit<DecisionRecord, "id" | "createdAt" | "updatedAt">): Promise<DecisionRecord>;
  listByActionPlan(actionPlanId: string): Promise<DecisionRecord[]>;
}

export interface OutcomeRepository {
  save(outcome: Omit<OutcomeRecord, "id" | "createdAt" | "updatedAt">): Promise<OutcomeRecord>;
  findByActionPlan(actionPlanId: string): Promise<OutcomeRecord | null>;
  findById(id: string): Promise<OutcomeRecord | null>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<OutcomeRecord[]>;
  updateMeasured(id: string, beforeValue: number | null, afterValue: number | null, status: OutcomeStatus, measuredAt: Date): Promise<OutcomeRecord>;
}

export interface GoalRepository {
  save(goal: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">): Promise<GoalRecord>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<GoalRecord[]>;
  findById(id: string): Promise<GoalRecord | null>;
  updatePacing(id: string, pacing: GoalRecord["pacing"], status?: GoalStatus): Promise<GoalRecord>;
}

export interface PredictionRepository {
  save(prediction: Omit<PredictionRecord, "id" | "createdAt" | "updatedAt">): Promise<PredictionRecord>;
  listActive(organizationId: string, storeId?: string, limit?: number): Promise<PredictionRecord[]>;
  findById(id: string): Promise<PredictionRecord | null>;
  expire(id: string): Promise<PredictionRecord>;
}

export interface HypothesisRepository {
  save(hypothesis: Omit<HypothesisRecord, "id" | "createdAt" | "updatedAt">): Promise<HypothesisRecord>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<HypothesisRecord[]>;
  findById(id: string): Promise<HypothesisRecord | null>;
  updateStatus(id: string, status: HypothesisStatus, validatedAt?: Date | null): Promise<HypothesisRecord>;
}

export interface BusinessLearningRepository {
  save(record: Omit<BusinessLearningRecord, "id" | "createdAt" | "updatedAt">): Promise<BusinessLearningRecord>;
  findByRule(organizationId: string, ruleName: string, storeId?: string): Promise<BusinessLearningRecord | null>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<BusinessLearningRecord[]>;
  updateOutcome(id: string, success: boolean, weightDelta: number, lastOutcomeAt: Date): Promise<BusinessLearningRecord>;
}

export interface CompetitorInsightRepository {
  save(insight: Omit<CompetitorInsightRecord, "id" | "createdAt" | "updatedAt">): Promise<CompetitorInsightRecord>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<CompetitorInsightRecord[]>;
  findById(id: string): Promise<CompetitorInsightRecord | null>;
}

export interface PortfolioSnapshotRepository {
  save(snapshot: Omit<PortfolioSnapshotRecord, "id" | "createdAt" | "updatedAt">): Promise<PortfolioSnapshotRecord>;
  findLatest(organizationId: string): Promise<PortfolioSnapshotRecord | null>;
  list(organizationId: string, limit?: number): Promise<PortfolioSnapshotRecord[]>;
}

export interface SystemMetricRepository {
  save(metric: Omit<SystemMetricRecord, "id" | "createdAt" | "updatedAt">): Promise<SystemMetricRecord>;
  list(organizationId: string, operation?: string, limit?: number): Promise<SystemMetricRecord[]>;
  summary(organizationId: string): Promise<{ avgLatencyMs: number | null; totalCostCents: number | null; operationCount: number; slowestOperation: string | null }>;
}

export interface KpiSnapshot {
  organizationId: string;
  storeId?: string;
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
  getWorkspaceSnapshot(organizationId: string, storeId: string | null, period: KpiSnapshot["period"], now?: Date): Promise<KpiSnapshot>;
}

export interface ActionExecutor {
  execute(actionType: string, params: unknown): Promise<{ ok: boolean; message?: string }>;
}

export interface RecommendationConflictRepository {
  save(conflict: Omit<RecommendationConflictRecord, "id" | "resolvedAt">): Promise<RecommendationConflictRecord>;
  listRecent(organizationId: string, storeId?: string, limit?: number): Promise<RecommendationConflictRecord[]>;
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
};

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
  RecommendationStatus,
  ActionPlanStatus,
  DecisionType,
  OutcomeStatus,
  GoalStatus,
  ConfidenceLevel,
  LinkStatus,
  DataQualityStatus,
  DataQualitySeverity,
  MetricSnapshotStatus,
  InsightType,
  InsightSeverity,
  InsightStatus,
  RiskTier,
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
  findBetween(
    organizationId: string,
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityLinkRecord | null>;
  findById(id: string): Promise<EntityLinkRecord | null>;
  updateStatus(id: string, status: LinkStatus): Promise<EntityLinkRecord>;
  updateConfidence(id: string, confidence: ConfidenceLevel, resolutionMethod: string): Promise<EntityLinkRecord>;
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
  findById(id: string): Promise<BusinessInsightRecord | null>;
  updateStatus(id: string, status: InsightStatus): Promise<BusinessInsightRecord>;
}

export interface RecommendationRepository {
  save(rec: Omit<RecommendationRecord, "id" | "createdAt" | "updatedAt">): Promise<RecommendationRecord>;
  listOpen(organizationId: string, storeId?: string, limit?: number): Promise<RecommendationRecord[]>;
  findById(id: string): Promise<RecommendationRecord | null>;
  updateStatus(id: string, status: RecommendationStatus): Promise<RecommendationRecord>;
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
  updateMeasured(id: string, beforeValue: number | null, afterValue: number | null, status: OutcomeStatus, measuredAt: Date): Promise<OutcomeRecord>;
}

export interface GoalRepository {
  save(goal: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">): Promise<GoalRecord>;
  list(organizationId: string, storeId?: string, limit?: number): Promise<GoalRecord[]>;
  findById(id: string): Promise<GoalRecord | null>;
  updatePacing(id: string, pacing: GoalRecord["pacing"], status?: GoalStatus): Promise<GoalRecord>;
}

export interface ActionExecutor {
  canExecute(actionType: string, riskTier: RiskTier, userRole: string | null): { allowed: boolean; requiresApproval: boolean };
  execute(actionType: string, params: unknown): Promise<{ ok: boolean; message?: string }>;
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
  RecommendationStatus,
  ActionPlanStatus,
  DecisionType,
  OutcomeStatus,
  GoalStatus,
  ConfidenceLevel,
  LinkStatus,
  DataQualityStatus,
  DataQualitySeverity,
  MetricSnapshotStatus,
  InsightType,
  InsightSeverity,
  InsightStatus,
  RiskTier,
};

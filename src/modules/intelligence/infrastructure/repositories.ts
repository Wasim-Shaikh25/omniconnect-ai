import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  SignalRepository,
  EntityLinkRepository,
  DataQualityRepository,
  MetricRepository,
  BusinessInsightRepository,
  RecommendationRepository,
  DailyActionRepository,
  ActionOutcomeRepository,
  JourneyRepository,
  ActionPlanRepository,
  DecisionRepository,
  OutcomeRepository,
  GoalRepository,
  PredictionRepository,
  HypothesisRepository,
  BusinessLearningRepository,
  CompetitorInsightRepository,
  PortfolioSnapshotRepository,
  SystemMetricRepository,
  KpiRepository,
  RecommendationConflictRepository,
} from "../application/ports";
import type { KpiSnapshot } from "../application/ports";
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
  OutcomeStatus,
  GoalStatus,
  HypothesisStatus,
  DailyActionRecord,
  DailyActionStatus,
  ActionOutcomeRecord,
  ActionOutcomeStatus,
  JourneyRecord,
  JourneyStepRecord,
  JourneyOutcome,
} from "../domain/types";

type StoredSignal = {
  id: string;
  userId: string;
  projectId: string;
  eventType: string;
  schemaVersion: number;
  subjectType: string;
  subjectId: string;
  stage: string | null;
  relatedEntities: unknown;
  data: unknown;
  lineage: unknown;
  source: string;
  occurredAt: Date;
  ingestedAt: Date;
  freshnessMs: number | null;
  qualityStatus: string | null;
  quarantineReason: string | null;
  traceId: string | null;
  createdAt: Date;
};

function toSignalRecord(row: StoredSignal): SignalRecord {
  const related = Array.isArray(row.relatedEntities)
    ? row.relatedEntities.map((e) => ({
        type: typeof e === "object" && e !== null && "type" in e ? String(e.type) : "unknown",
        id: typeof e === "object" && e !== null && "id" in e ? String(e.id) : "",
        confidence:
          typeof e === "object" &&
          e !== null &&
          "confidence" in e &&
          (e.confidence === "VERIFIED" || e.confidence === "PROBABLE" || e.confidence === "POSSIBLE" || e.confidence === "REJECTED")
            ? e.confidence
            : undefined,
      }))
    : [];

  return {
    ...row,
    stage: row.stage as SignalRecord["stage"],
    relatedEntities: related as SignalRecord["relatedEntities"],
  };
}

export class PrismaSignalRepository implements SignalRepository {
  async save(signal: Omit<SignalRecord, "id" | "createdAt">): Promise<SignalRecord> {
    const created = await prisma.signal.create({
      data: signal as unknown as Prisma.SignalCreateInput,
    });
    return toSignalRecord(created as StoredSignal);
  }

  async listBySubject(
    userId: string,
    subjectType: string,
    subjectId: string,
    limit = 100,
  ): Promise<SignalRecord[]> {
    const rows = await prisma.signal.findMany({
      where: {
        userId,
        subjectType,
        subjectId,
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toSignalRecord(r as StoredSignal));
  }

  async listByStore(projectId: string, limit = 100): Promise<SignalRecord[]> {
    const rows = await prisma.signal.findMany({
      where: { projectId },
      orderBy: { ingestedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toSignalRecord(r as StoredSignal));
  }

  async getLatestBySubject(
    userId: string,
    subjectType: string,
    subjectId: string,
    eventType: string,
  ): Promise<SignalRecord | null> {
    const row = await prisma.signal.findFirst({
      where: {
        userId,
        subjectType,
        subjectId,
        eventType,
      },
      orderBy: { occurredAt: "desc" },
    });
    return row ? toSignalRecord(row as StoredSignal) : null;
  }

  async listByRelatedEntity(
    userId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<SignalRecord[]> {
    const rows = await prisma.signal.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 1000,
    });
    const filtered = rows
      .map((r) => toSignalRecord(r as StoredSignal))
      .filter((signal) =>
        signal.relatedEntities.some((e) => e.type === entityType && e.id === entityId),
      );
    return filtered.slice(0, limit);
  }
}

type StoredLink = {
  id: string;
  userId: string;
  projectId: string | null;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType: string;
  confidence: EntityLinkRecord["confidence"];
  resolutionMethod: string | null;
  status: EntityLinkRecord["status"];
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaEntityLinkRepository implements EntityLinkRepository {
  async save(link: Omit<EntityLinkRecord, "id" | "createdAt" | "updatedAt">): Promise<EntityLinkRecord> {
    const created = await prisma.entityLink.create({
      data: link as unknown as Prisma.EntityLinkCreateInput,
    });
    return created as StoredLink;
  }

  async listForOrganization(userId: string, limit = 100): Promise<EntityLinkRecord[]> {
    const rows = await prisma.entityLink.findMany({
      where: { userId },
      take: limit,
    });
    return rows.map((r) => r as StoredLink);
  }

  async findByEntity(
    userId: string,
    entityType: string,
    entityId: string,
    activeOnly = true,
    limit = 1000,
  ): Promise<EntityLinkRecord[]> {
    const rows = await prisma.entityLink.findMany({
      where: {
        userId,
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { targetType: entityType, targetId: entityId },
        ],
        ...(activeOnly ? { status: "ACTIVE" } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows as StoredLink[];
  }

  async findById(id: string, userId?: string): Promise<EntityLinkRecord | null> {
    const row = await prisma.entityLink.findUnique({
      where: userId ? { id, userId } : { id },
    });
    return (row as StoredLink) ?? null;
  }

  async findBetween(
    userId: string,
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityLinkRecord | null> {
    const row = await prisma.entityLink.findFirst({
      where: {
        userId,
        sourceType,
        sourceId,
        targetType,
        targetId,
      },
    });
    return (row as StoredLink) ?? null;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: EntityLinkRecord["status"],
  ): Promise<EntityLinkRecord> {
    const data: Prisma.EntityLinkUpdateInput = { status };
    const updated = await prisma.entityLink.update({
      where: { id, userId },
      data,
    });
    return updated as StoredLink;
  }

  async updateConfidence(
    id: string,
    userId: string,
    confidence: EntityLinkRecord["confidence"],
    resolutionMethod: string,
  ): Promise<EntityLinkRecord> {
    const data: Prisma.EntityLinkUpdateInput = { confidence, resolutionMethod };
    const updated = await prisma.entityLink.update({
      where: { id, userId },
      data,
    });
    return updated as StoredLink;
  }
}

type StoredIssue = {
  id: string;
  userId: string;
  projectId: string | null;
  source: string;
  entityType: string | null;
  entityId: string | null;
  metricName: string | null;
  severity: DataQualityIssueRecord["severity"];
  impact: string | null;
  status: DataQualityIssueRecord["status"];
  detectedAt: Date;
  resolvedAt: Date | null;
};

export class PrismaDataQualityRepository implements DataQualityRepository {
  async save(
    issue: Omit<DataQualityIssueRecord, "id" | "detectedAt" | "resolvedAt">,
  ): Promise<DataQualityIssueRecord> {
    const created = await prisma.dataQualityIssue.create({
      data: issue as unknown as Prisma.DataQualityIssueCreateInput,
    });
    return created as StoredIssue;
  }

  async listOpen(userId: string, projectId?: string, limit = 1000): Promise<DataQualityIssueRecord[]> {
    const rows = await prisma.dataQualityIssue.findMany({
      where: {
        userId,
        status: "OPEN",
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
    return rows as StoredIssue[];
  }

  async listByStore(projectId: string, limit = 50): Promise<DataQualityIssueRecord[]> {
    const rows = await prisma.dataQualityIssue.findMany({
      where: { projectId },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
    return rows as StoredIssue[];
  }

  async findById(id: string, userId: string): Promise<DataQualityIssueRecord | null> {
    const row = await prisma.dataQualityIssue.findUnique({ where: { id, userId } });
    return (row as StoredIssue) ?? null;
  }

  async updateStatus(id: string, userId: string, status: DataQualityIssueRecord["status"]): Promise<DataQualityIssueRecord> {
    const data: Prisma.DataQualityIssueUpdateInput = { status };
    if (status === "RESOLVED") data.resolvedAt = new Date();
    const updated = await prisma.dataQualityIssue.update({ where: { id, userId }, data });
    return updated as StoredIssue;
  }
}

type StoredMetricDefinition = {
  id: string;
  userId: string | null;
  name: string;
  displayName: string;
  description: string | null;
  formula: string | null;
  grain: string | null;
  dimensions: string[];
  source: string;
  freshnessSlaMs: number;
  owner: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type StoredMetricSnapshot = {
  id: string;
  definitionId: string;
  userId: string;
  projectId: string | null;
  value: unknown;
  dimensions: unknown;
  periodStart: Date;
  periodEnd: Date;
  status: MetricSnapshotRecord["status"];
  sourceIds: string[];
  computedAt: Date;
};

function toMetricSnapshotRecord(row: StoredMetricSnapshot): MetricSnapshotRecord {
  return {
    ...row,
    value: typeof row.value === "string" ? Number(row.value) : (row.value as number | null),
    dimensions: row.dimensions as MetricSnapshotRecord["dimensions"],
  };
}

export class PrismaMetricRepository implements MetricRepository {
  async saveDefinition(
    def: Omit<MetricDefinitionRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<MetricDefinitionRecord> {
    const created = await prisma.metricDefinition.create({
      data: def as unknown as Prisma.MetricDefinitionCreateInput,
    });
    return created as StoredMetricDefinition;
  }

  async findDefinition(userId: string | null, name: string): Promise<MetricDefinitionRecord | null> {
    const row = await prisma.metricDefinition.findFirst({
      where: { userId, name },
    });
    return (row as StoredMetricDefinition) ?? null;
  }

  async listDefinitions(userId: string | null, limit = 1000): Promise<MetricDefinitionRecord[]> {
    const rows = await prisma.metricDefinition.findMany({
      where: { userId },
      take: limit,
    });
    return rows as StoredMetricDefinition[];
  }

  async saveSnapshot(snapshot: Omit<MetricSnapshotRecord, "id" | "computedAt">): Promise<MetricSnapshotRecord> {
    const data: Prisma.MetricSnapshotUncheckedCreateInput = {
      ...snapshot,
      value: snapshot.value === null ? null : String(snapshot.value),
      dimensions: snapshot.dimensions ?? undefined,
    };
    const created = await prisma.metricSnapshot.create({ data });
    return toMetricSnapshotRecord(created as StoredMetricSnapshot);
  }

  async getLatestSnapshot(
    definitionId: string,
    userId: string,
    projectId: string | null,
  ): Promise<MetricSnapshotRecord | null> {
    const row = await prisma.metricSnapshot.findFirst({
      where: {
        definitionId,
        userId,
        projectId,
      },
      orderBy: { computedAt: "desc" },
    });
    return row ? toMetricSnapshotRecord(row as StoredMetricSnapshot) : null;
  }
}

type StoredBusinessInsight = {
  id: string;
  userId: string;
  projectId: string | null;
  type: BusinessInsightRecord["type"];
  severity: BusinessInsightRecord["severity"];
  status: BusinessInsightRecord["status"];
  title: string;
  description: string;
  evidence: unknown;
  deepLink: string | null;
  generatedAt: Date;
  dismissedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toInsightRecord(row: StoredBusinessInsight): BusinessInsightRecord {
  const evidence =
    typeof row.evidence === "object" && row.evidence !== null
      ? (row.evidence as BusinessInsightRecord["evidence"])
      : null;
  return { ...row, evidence };
}

export class PrismaBusinessInsightRepository implements BusinessInsightRepository {
  async save(insight: Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt">): Promise<BusinessInsightRecord> {
    const created = await prisma.businessInsight.create({
      data: insight as unknown as Prisma.BusinessInsightCreateInput,
    });
    return toInsightRecord(created as StoredBusinessInsight);
  }

  async listOpen(userId: string, projectId?: string, limit = 50): Promise<BusinessInsightRecord[]> {
    const rows = await prisma.businessInsight.findMany({
      where: {
        userId,
        status: "OPEN",
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ severity: "desc" }, { generatedAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toInsightRecord(r as StoredBusinessInsight));
  }

  async findById(id: string, userId?: string): Promise<BusinessInsightRecord | null> {
    const row = await prisma.businessInsight.findUnique({
      where: userId ? { id, userId } : { id },
    });
    return row ? toInsightRecord(row as StoredBusinessInsight) : null;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: BusinessInsightRecord["status"],
  ): Promise<BusinessInsightRecord> {
    const data: Prisma.BusinessInsightUpdateInput = { status };
    if (status === "DISMISSED") data.dismissedAt = new Date();
    if (status !== "SNOOZED") data.snoozedUntil = null;
    const updated = await prisma.businessInsight.update({
      where: { id, userId },
      data,
    });
    return toInsightRecord(updated as StoredBusinessInsight);
  }
}

type StoredRecommendation = {
  id: string;
  userId: string;
  projectId: string | null;
  insightId: string | null;
  producedByModule: string;
  producedByService: string | null;
  title: string;
  description: string;
  objective: string | null;
  businessObjective: RecommendationRecord["businessObjective"];
  reasoning: string | null;
  marketContext: string | null;
  competitorContext: string | null;
  selfContext: string | null;
  reasonCodes: string[];
  impactRange: unknown;
  confidence: number | null;
  confidenceSignals: number;
  effort: string | null;
  urgency: string | null;
  riskTier: RecommendationRecord["riskTier"];
  eligibility: unknown;
  status: RecommendationRecord["status"];
  actionType: string;
  actionParams: unknown;
  deepLink: string | null;
  validFrom: Date;
  validUntil: Date | null;
  invalidatedAt: Date | null;
  invalidatedByEvent: string | null;
  generatedAt: Date;
  dismissedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecommendationRecord(row: StoredRecommendation): RecommendationRecord {
  return {
    ...row,
    impactRange:
      typeof row.impactRange === "object" && row.impactRange !== null
        ? (row.impactRange as RecommendationRecord["impactRange"])
        : null,
    eligibility:
      typeof row.eligibility === "object" && row.eligibility !== null ? row.eligibility : null,
    actionParams:
      typeof row.actionParams === "object" && row.actionParams !== null ? row.actionParams : null,
  };
}

export class PrismaRecommendationRepository implements RecommendationRepository {
  async save(rec: Omit<RecommendationRecord, "id" | "createdAt" | "updatedAt">): Promise<RecommendationRecord> {
    const created = await prisma.recommendation.create({
      data: rec as unknown as Prisma.RecommendationCreateInput,
    });
    return toRecommendationRecord(created as StoredRecommendation);
  }

  async listOpen(userId: string, projectId?: string, limit = 50): Promise<RecommendationRecord[]> {
    const rows = await prisma.recommendation.findMany({
      where: {
        userId,
        status: { in: ["PROPOSED", "ACCEPTED", "EDITED"] },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ generatedAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toRecommendationRecord(r as StoredRecommendation));
  }

  async listActive(userId: string, projectId?: string, limit = 50): Promise<RecommendationRecord[]> {
    const now = new Date();
    const rows = await prisma.recommendation.findMany({
      where: {
        userId,
        status: { in: ["PROPOSED", "ACCEPTED", "EDITED"] },
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        invalidatedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ generatedAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toRecommendationRecord(r as StoredRecommendation));
  }

  async findById(id: string, userId: string): Promise<RecommendationRecord | null> {
    const row = await prisma.recommendation.findUnique({ where: { id, userId } });
    return row ? toRecommendationRecord(row as StoredRecommendation) : null;
  }

  async updateStatus(id: string, userId: string, status: RecommendationStatus): Promise<RecommendationRecord> {
    const data: Prisma.RecommendationUpdateInput = { status };
    if (status === "DISMISSED") data.dismissedAt = new Date();
    if (status !== "SNOOZED") data.snoozedUntil = null;
    if (status === "EXPIRED") data.invalidatedAt = new Date();
    const updated = await prisma.recommendation.update({ where: { id, userId }, data });
    return toRecommendationRecord(updated as StoredRecommendation);
  }

  async updateObjective(
    id: string,
    userId: string,
    objective: RecommendationRecord["businessObjective"],
    reason: string,
  ): Promise<RecommendationRecord | null> {
    const updated = await prisma.recommendation.update({
      where: { id, userId },
      data: { businessObjective: objective ?? undefined, reasoning: reason },
    });
    return toRecommendationRecord(updated as StoredRecommendation);
  }

  async updateConfidence(id: string, userId: string, confidence: number, signals: number): Promise<RecommendationRecord | null> {
    const updated = await prisma.recommendation.update({
      where: { id, userId },
      data: { confidence, confidenceSignals: signals },
    });
    return toRecommendationRecord(updated as StoredRecommendation);
  }

  async invalidate(id: string, userId: string, eventName: string): Promise<RecommendationRecord> {
    const data: Prisma.RecommendationUpdateInput = {
      status: "EXPIRED",
      invalidatedAt: new Date(),
      invalidatedByEvent: eventName,
    };
    const updated = await prisma.recommendation.update({ where: { id, userId }, data });
    return toRecommendationRecord(updated as StoredRecommendation);
  }
}

type StoredActionPlan = {
  id: string;
  userId: string;
  projectId: string | null;
  recommendationId: string | null;
  title: string;
  steps: unknown;
  targetMetric: string | null;
  expectedImpact: unknown;
  status: ActionPlanRecord["status"];
  approvedBy: string | null;
  executedAt: Date | null;
  stoppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toActionPlanRecord(row: StoredActionPlan): ActionPlanRecord {
  return {
    ...row,
    steps: typeof row.steps === "object" && row.steps !== null ? row.steps : null,
    expectedImpact:
      typeof row.expectedImpact === "object" && row.expectedImpact !== null
        ? (row.expectedImpact as ActionPlanRecord["expectedImpact"])
        : null,
  };
}

export class PrismaActionPlanRepository implements ActionPlanRepository {
  async save(plan: Omit<ActionPlanRecord, "id" | "createdAt" | "updatedAt">): Promise<ActionPlanRecord> {
    const created = await prisma.actionPlan.create({
      data: plan as unknown as Prisma.ActionPlanCreateInput,
    });
    return toActionPlanRecord(created as StoredActionPlan);
  }

  async findById(id: string, userId: string): Promise<ActionPlanRecord | null> {
    const row = await prisma.actionPlan.findUnique({ where: { id, userId } });
    return row ? toActionPlanRecord(row as StoredActionPlan) : null;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: ActionPlanStatus,
    approvedBy?: string | null,
    executedAt?: Date | null,
    stoppedAt?: Date | null,
  ): Promise<ActionPlanRecord> {
    const data: Prisma.ActionPlanUpdateInput = { status };
    if (approvedBy !== undefined) data.approvedBy = approvedBy;
    if (executedAt !== undefined) data.executedAt = executedAt ?? null;
    if (stoppedAt !== undefined) data.stoppedAt = stoppedAt ?? null;
    const updated = await prisma.actionPlan.update({ where: { id, userId }, data });
    return toActionPlanRecord(updated as StoredActionPlan);
  }
}

type StoredDecision = {
  id: string;
  userId: string;
  actionPlanId: string;
  recommendationId: string | null;
  decisionType: DecisionRecord["decisionType"];
  reason: string | null;
  decidedBy: string;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaDecisionRepository implements DecisionRepository {
  async save(decision: Omit<DecisionRecord, "id" | "createdAt" | "updatedAt">): Promise<DecisionRecord> {
    const created = await prisma.decision.create({
      data: decision as unknown as Prisma.DecisionCreateInput,
    });
    return created as StoredDecision;
  }

  async listByActionPlan(actionPlanId: string, limit = 1000): Promise<DecisionRecord[]> {
    const rows = await prisma.decision.findMany({
      where: { actionPlanId },
      orderBy: { decidedAt: "desc" },
      take: limit,
    });
    return rows as StoredDecision[];
  }
}

type StoredOutcome = {
  id: string;
  userId: string;
  projectId: string | null;
  actionPlanId: string;
  metricName: string | null;
  beforeValue: number | null;
  afterValue: number | null;
  observationWindowDays: number;
  measuredAt: Date | null;
  status: OutcomeRecord["status"];
  attribution: string | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaOutcomeRepository implements OutcomeRepository {
  async save(outcome: Omit<OutcomeRecord, "id" | "createdAt" | "updatedAt">): Promise<OutcomeRecord> {
    const created = await prisma.outcome.create({
      data: outcome as unknown as Prisma.OutcomeCreateInput,
    });
    return created as StoredOutcome;
  }

  async findByActionPlan(actionPlanId: string, userId: string): Promise<OutcomeRecord | null> {
    const row = await prisma.outcome.findFirst({ where: { actionPlanId, userId } });
    return (row as StoredOutcome) ?? null;
  }

  async findById(id: string, userId: string): Promise<OutcomeRecord | null> {
    const row = await prisma.outcome.findUnique({ where: { id, userId } });
    return (row as StoredOutcome) ?? null;
  }

  async list(userId: string, projectId?: string, limit = 20): Promise<OutcomeRecord[]> {
    const rows = await prisma.outcome.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => r as StoredOutcome);
  }

  async updateMeasured(
    id: string,
    userId: string,
    beforeValue: number | null,
    afterValue: number | null,
    status: OutcomeStatus,
    measuredAt: Date,
  ): Promise<OutcomeRecord> {
    const updated = await prisma.outcome.update({
      where: { id, userId },
      data: { beforeValue, afterValue, status, measuredAt },
    });
    return updated as StoredOutcome;
  }
}

type StoredGoal = {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  targetMetric: string;
  baseline: number | null;
  target: number | null;
  startDate: Date;
  endDate: Date | null;
  ownerUserId: string | null;
  pacing: unknown;
  status: GoalRecord["status"];
  createdAt: Date;
  updatedAt: Date;
};

function toGoalRecord(row: StoredGoal): GoalRecord {
  return {
    ...row,
    pacing:
      typeof row.pacing === "object" && row.pacing !== null
        ? (row.pacing as GoalRecord["pacing"])
        : null,
  };
}

export class PrismaGoalRepository implements GoalRepository {
  async save(goal: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">): Promise<GoalRecord> {
    const created = await prisma.goal.create({
      data: goal as unknown as Prisma.GoalCreateInput,
    });
    return toGoalRecord(created as StoredGoal);
  }

  async list(userId: string, projectId?: string, limit = 50): Promise<GoalRecord[]> {
    const rows = await prisma.goal.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toGoalRecord(r as StoredGoal));
  }

  async findById(id: string, userId: string): Promise<GoalRecord | null> {
    const row = await prisma.goal.findUnique({ where: { id, userId } });
    return row ? toGoalRecord(row as StoredGoal) : null;
  }

  async updatePacing(id: string, userId: string, pacing: GoalRecord["pacing"], status?: GoalStatus): Promise<GoalRecord> {
    const data: Prisma.GoalUpdateInput = {
      pacing: (pacing ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
    };
    if (status) data.status = status;
    const updated = await prisma.goal.update({ where: { id, userId }, data });
    return toGoalRecord(updated as StoredGoal);
  }
}

type StoredPrediction = {
  id: string;
  userId: string;
  projectId: string | null;
  predictionType: PredictionRecord["predictionType"];
  targetEntityType: string | null;
  targetEntityId: string | null;
  horizon: string;
  estimate: number;
  probability: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  features: unknown;
  calibration: string | null;
  expiresAt: Date;
  status: PredictionRecord["status"];
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPredictionRecord(row: StoredPrediction): PredictionRecord {
  return {
    ...row,
    features:
      typeof row.features === "object" && row.features !== null ? row.features : null,
  };
}

export class PrismaPredictionRepository implements PredictionRepository {
  async save(prediction: Omit<PredictionRecord, "id" | "createdAt" | "updatedAt">): Promise<PredictionRecord> {
    const created = await prisma.prediction.create({
      data: prediction as unknown as Prisma.PredictionCreateInput,
    });
    return toPredictionRecord(created as StoredPrediction);
  }

  async listActive(userId: string, projectId?: string, limit = 50): Promise<PredictionRecord[]> {
    const rows = await prisma.prediction.findMany({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: { gte: new Date() },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toPredictionRecord(r as StoredPrediction));
  }

  async findById(id: string, userId: string): Promise<PredictionRecord | null> {
    const row = await prisma.prediction.findUnique({ where: { id, userId } });
    return row ? toPredictionRecord(row as StoredPrediction) : null;
  }

  async expire(id: string, userId: string): Promise<PredictionRecord> {
    const updated = await prisma.prediction.update({ where: { id, userId }, data: { status: "EXPIRED" } });
    return toPredictionRecord(updated as StoredPrediction);
  }
}

type StoredHypothesis = {
  id: string;
  userId: string;
  projectId: string | null;
  insightId: string | null;
  statement: string;
  features: unknown;
  expectedOutcome: string | null;
  status: HypothesisRecord["status"];
  validatedAt: Date | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function toHypothesisRecord(row: StoredHypothesis): HypothesisRecord {
  return {
    ...row,
    features:
      typeof row.features === "object" && row.features !== null ? row.features : null,
  };
}

export class PrismaHypothesisRepository implements HypothesisRepository {
  async save(hypothesis: Omit<HypothesisRecord, "id" | "createdAt" | "updatedAt">): Promise<HypothesisRecord> {
    const created = await prisma.hypothesis.create({
      data: hypothesis as unknown as Prisma.HypothesisCreateInput,
    });
    return toHypothesisRecord(created as StoredHypothesis);
  }

  async list(userId: string, projectId?: string, limit = 50): Promise<HypothesisRecord[]> {
    const rows = await prisma.hypothesis.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toHypothesisRecord(r as StoredHypothesis));
  }

  async findById(id: string, userId: string): Promise<HypothesisRecord | null> {
    const row = await prisma.hypothesis.findUnique({ where: { id, userId } });
    return row ? toHypothesisRecord(row as StoredHypothesis) : null;
  }

  async updateStatus(id: string, userId: string, status: HypothesisStatus, validatedAt?: Date | null): Promise<HypothesisRecord> {
    const data: Prisma.HypothesisUpdateInput = { status };
    if (validatedAt !== undefined) data.validatedAt = validatedAt ?? null;
    const updated = await prisma.hypothesis.update({ where: { id, userId }, data });
    return toHypothesisRecord(updated as StoredHypothesis);
  }
}

type StoredBusinessLearning = {
  id: string;
  userId: string;
  projectId: string | null;
  ruleName: string;
  condition: unknown;
  effect: unknown;
  weight: number;
  successCount: number;
  failureCount: number;
  lastOutcomeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toBusinessLearningRecord(row: StoredBusinessLearning): BusinessLearningRecord {
  return {
    ...row,
    condition:
      typeof row.condition === "object" && row.condition !== null ? row.condition : null,
    effect:
      typeof row.effect === "object" && row.effect !== null ? row.effect : null,
  };
}

export class PrismaBusinessLearningRepository implements BusinessLearningRepository {
  async save(record: Omit<BusinessLearningRecord, "id" | "createdAt" | "updatedAt">): Promise<BusinessLearningRecord> {
    const created = await prisma.businessLearning.create({
      data: record as unknown as Prisma.BusinessLearningCreateInput,
    });
    return toBusinessLearningRecord(created as StoredBusinessLearning);
  }

  async findByRule(userId: string, ruleName: string, projectId?: string): Promise<BusinessLearningRecord | null> {
    const row = await prisma.businessLearning.findFirst({
      where: { userId, ruleName, ...(projectId ? { projectId } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return row ? toBusinessLearningRecord(row as StoredBusinessLearning) : null;
  }

  async list(userId: string, projectId?: string, limit = 50): Promise<BusinessLearningRecord[]> {
    const rows = await prisma.businessLearning.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      orderBy: { weight: "desc" },
      take: limit,
    });
    return rows.map((r) => toBusinessLearningRecord(r as StoredBusinessLearning));
  }

  async findById(id: string, userId: string): Promise<BusinessLearningRecord | null> {
    const row = await prisma.businessLearning.findUnique({ where: { id, userId } });
    return row ? toBusinessLearningRecord(row as StoredBusinessLearning) : null;
  }

  async updateOutcome(id: string, userId: string, success: boolean, weightDelta: number, lastOutcomeAt: Date): Promise<BusinessLearningRecord> {
    const existing = await prisma.businessLearning.findUnique({ where: { id, userId } });
    if (!existing) throw new Error("BusinessLearning record not found");
    const data: Prisma.BusinessLearningUpdateInput = {
      weight: existing.weight + weightDelta,
      successCount: existing.successCount + (success ? 1 : 0),
      failureCount: existing.failureCount + (success ? 0 : 1),
      lastOutcomeAt,
    };
    const updated = await prisma.businessLearning.update({ where: { id, userId }, data });
    return toBusinessLearningRecord(updated as StoredBusinessLearning);
  }
}

type StoredCompetitorInsight = {
  id: string;
  userId: string;
  projectId: string | null;
  competitorHandle: string;
  metricName: string;
  value: number;
  benchmarkDelta: number | null;
  features: unknown;
  source: string | null;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toCompetitorInsightRecord(row: StoredCompetitorInsight): CompetitorInsightRecord {
  return {
    ...row,
    features: typeof row.features === "object" && row.features !== null ? row.features : null,
  };
}

export class PrismaCompetitorInsightRepository implements CompetitorInsightRepository {
  async save(insight: Omit<CompetitorInsightRecord, "id" | "createdAt" | "updatedAt">): Promise<CompetitorInsightRecord> {
    const created = await prisma.competitorInsight.create({
      data: insight as unknown as Prisma.CompetitorInsightCreateInput,
    });
    return toCompetitorInsightRecord(created as StoredCompetitorInsight);
  }

  async list(userId: string, projectId?: string, limit = 50): Promise<CompetitorInsightRecord[]> {
    const rows = await prisma.competitorInsight.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      orderBy: { capturedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toCompetitorInsightRecord(r as StoredCompetitorInsight));
  }

  async findById(id: string, userId: string): Promise<CompetitorInsightRecord | null> {
    const row = await prisma.competitorInsight.findUnique({ where: { id, userId } });
    return row ? toCompetitorInsightRecord(row as StoredCompetitorInsight) : null;
  }
}

type StoredPortfolioSnapshot = {
  id: string;
  userId: string;
  storeCount: number;
  totalRevenueEstimate: number | null;
  totalChurnRisk: number | null;
  topRecommendationType: string | null;
  topRiskStoreId: string | null;
  features: unknown;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toPortfolioSnapshotRecord(row: StoredPortfolioSnapshot): PortfolioSnapshotRecord {
  return {
    ...row,
    features: typeof row.features === "object" && row.features !== null ? row.features : null,
  };
}

export class PrismaPortfolioSnapshotRepository implements PortfolioSnapshotRepository {
  async save(snapshot: Omit<PortfolioSnapshotRecord, "id" | "createdAt" | "updatedAt">): Promise<PortfolioSnapshotRecord> {
    const created = await prisma.portfolioSnapshot.create({
      data: snapshot as unknown as Prisma.PortfolioSnapshotCreateInput,
    });
    return toPortfolioSnapshotRecord(created as StoredPortfolioSnapshot);
  }

  async findLatest(userId: string): Promise<PortfolioSnapshotRecord | null> {
    const row = await prisma.portfolioSnapshot.findFirst({
      where: { userId },
      orderBy: { generatedAt: "desc" },
    });
    return row ? toPortfolioSnapshotRecord(row as StoredPortfolioSnapshot) : null;
  }

  async list(userId: string, limit = 10): Promise<PortfolioSnapshotRecord[]> {
    const rows = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toPortfolioSnapshotRecord(r as StoredPortfolioSnapshot));
  }
}

type StoredSystemMetric = {
  id: string;
  userId: string;
  operation: string;
  module: string;
  latencyMs: number | null;
  costCents: number | null;
  status: string;
  traceId: string | null;
  metadata: unknown;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toSystemMetricRecord(row: StoredSystemMetric): SystemMetricRecord {
  return {
    ...row,
    metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata : null,
  };
}

export class PrismaSystemMetricRepository implements SystemMetricRepository {
  async save(metric: Omit<SystemMetricRecord, "id" | "createdAt" | "updatedAt">): Promise<SystemMetricRecord> {
    const created = await prisma.systemMetric.create({
      data: metric as unknown as Prisma.SystemMetricCreateInput,
    });
    return toSystemMetricRecord(created as StoredSystemMetric);
  }

  async list(userId: string, operation?: string, limit = 50): Promise<SystemMetricRecord[]> {
    const rows = await prisma.systemMetric.findMany({
      where: { userId, ...(operation ? { operation } : {}) },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toSystemMetricRecord(r as StoredSystemMetric));
  }

  async summary(userId: string): Promise<{ avgLatencyMs: number | null; totalCostCents: number | null; operationCount: number; slowestOperation: string | null }> {
    const rows = await prisma.systemMetric.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take: 1000,
    });
    const withLatency = rows
      .map((r) => toSystemMetricRecord(r as StoredSystemMetric))
      .filter((r) => typeof r.latencyMs === "number" && r.latencyMs !== null) as { latencyMs: number; operation: string; costCents: number | null }[];
    const avgLatencyMs = withLatency.length > 0
      ? withLatency.reduce((sum, r) => sum + r.latencyMs, 0) / withLatency.length
      : null;
    const totalCostCents = rows.reduce((sum, r) => sum + (r.costCents ?? 0), 0);
    const slowest = withLatency.length > 0
      ? withLatency.sort((a, b) => b.latencyMs - a.latencyMs)[0]
      : null;
    return {
      avgLatencyMs,
      totalCostCents,
      operationCount: rows.length,
      slowestOperation: slowest?.operation ?? null,
    };
  }
}

const PERIOD_MS: Record<KpiSnapshot["period"], number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export class PrismaKpiRepository implements KpiRepository {
  async getWorkspaceSnapshot(
    userId: string,
    projectId: string | null,
    period: KpiSnapshot["period"],
    now: Date = new Date(),
  ): Promise<KpiSnapshot> {
    const since = new Date(now.getTime() - PERIOD_MS[period]);

    const storeFilter = projectId ? { projectId } : {};

    const [
      signals,
      insights,
      recommendations,
      actionPlans,
      outcomes,
      links,
    ] = await Promise.all([
      prisma.signal.findMany({
        where: { userId, ...storeFilter, occurredAt: { gte: since } },
        orderBy: { occurredAt: "desc" },
        take: 10000,
      }),
      prisma.businessInsight.findMany({
        where: { userId, ...storeFilter, generatedAt: { gte: since } },
        take: 10000,
      }),
      prisma.recommendation.findMany({
        where: { userId, ...storeFilter, generatedAt: { gte: since } },
        take: 10000,
      }),
      prisma.actionPlan.findMany({
        where: { userId, ...storeFilter, createdAt: { gte: since } },
        take: 10000,
      }),
      prisma.outcome.findMany({
        where: { userId, ...storeFilter, createdAt: { gte: since } },
        take: 10000,
      }),
      prisma.entityLink.findMany({
        where: { userId, ...(projectId ? { projectId } : {}) },
        take: 10000,
      }),
    ]);

    const insightsActed = insights.filter((i) => i.status === "RESOLVED").length;

    const recommendationsAccepted = recommendations.filter(
      (r) => r.status === "ACCEPTED" || r.status === "EDITED",
    ).length;
    const recommendationsDismissed = recommendations.filter((r) => r.status === "DISMISSED").length;

    const actionPlansExecuted = actionPlans.filter((p) => p.status === "EXECUTED" || p.executedAt !== null).length;
    const actionPlansSuccess = outcomes.filter((o) => o.status === "SUCCESS").length;
    const outcomesLinked = outcomes.filter((o) => o.actionPlanId !== null).length;

    const freshSignals = signals.filter(
      (s) =>
        s.freshnessMs !== null &&
        typeof s.freshnessMs === "number" &&
        s.freshnessMs <= 300_000,
    ).length;
    const signalFreshnessPct = signals.length ? Math.round((freshSignals / signals.length) * 100) : 100;

    const confidenceScores = links
      .map((l) => {
        switch (l.confidence) {
          case "VERIFIED":
            return 1;
          case "PROBABLE":
            return 0.75;
          case "POSSIBLE":
            return 0.5;
          case "REJECTED":
            return 0;
          default:
            return 0.5;
        }
      });
    const identityConfidenceAvg = confidenceScores.length
      ? confidenceScores.reduce((a, b) => (a as number) + (b as number), 0 as number) / confidenceScores.length
      : null;
    const highConfidenceEntityLinks = links.filter((l) => l.confidence === "VERIFIED" || l.confidence === "PROBABLE").length;

    // IAVA = successful outcomes + accepted recommendations + executed action plans within the period.
    const iava = actionPlansSuccess + recommendationsAccepted + actionPlansExecuted;

    return {
      userId,
      projectId: projectId ?? undefined,
      period,
      iava,
      insightsGenerated: insights.length,
      insightsActed,
      recommendationsAccepted,
      recommendationsDismissed,
      actionPlansExecuted,
      actionPlansSuccess,
      outcomesLinked,
      signalFreshnessPct,
      identityConfidenceAvg,
      highConfidenceEntityLinks,
    };
  }
}

type StoredRecommendationConflict = {
  id: string;
  userId: string;
  projectId: string | null;
  winnerId: string;
  runnerUpId: string | null;
  winnerTitle: string;
  runnerUpTitle: string | null;
  reason: string;
  appliedPolicy: string;
  resolvedAt: Date;
};

function toRecommendationConflictRecord(row: StoredRecommendationConflict): RecommendationConflictRecord {
  return row;
}

export class PrismaRecommendationConflictRepository implements RecommendationConflictRepository {
  async save(
    conflict: Omit<RecommendationConflictRecord, "id" | "resolvedAt">,
  ): Promise<RecommendationConflictRecord> {
    const created = await prisma.recommendationConflict.create({
      data: conflict as unknown as Prisma.RecommendationConflictCreateInput,
    });
    return toRecommendationConflictRecord(created as StoredRecommendationConflict);
  }

  async listRecent(
    userId: string,
    projectId?: string,
    limit = 10,
  ): Promise<RecommendationConflictRecord[]> {
    const rows = await prisma.recommendationConflict.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { resolvedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toRecommendationConflictRecord(r as StoredRecommendationConflict));
  }
}

// ── Daily operating rhythm (spec 0050) ──────────────────────────────────────

type StoredDailyAction = {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  description: string;
  objective: DailyActionRecord["objective"];
  confidence: number;
  priority: number;
  sourceSignals: unknown;
  suggestedAction: string | null;
  deepLink: string | null;
  status: DailyActionStatus;
  metricName: string | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  feedback: string | null;
  outcomeId: string | null;
  generatedForDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toDailyActionRecord(row: StoredDailyAction): DailyActionRecord {
  return {
    ...row,
    sourceSignals:
      typeof row.sourceSignals === "object" && row.sourceSignals !== null ? row.sourceSignals : null,
  };
}

export class PrismaDailyActionRepository implements DailyActionRepository {
  async save(action: Omit<DailyActionRecord, "id" | "createdAt" | "updatedAt">): Promise<DailyActionRecord> {
    const created = await prisma.dailyAction.create({
      data: action as unknown as Prisma.DailyActionCreateInput,
    });
    return toDailyActionRecord(created as StoredDailyAction);
  }

  async listPending(userId: string, projectId?: string, limit = 20): Promise<DailyActionRecord[]> {
    const rows = await prisma.dailyAction.findMany({
      where: { userId, status: "PENDING", ...(projectId ? { projectId } : {}) },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toDailyActionRecord(r as StoredDailyAction));
  }

  async listForDate(userId: string, since: Date, projectId?: string, limit = 50): Promise<DailyActionRecord[]> {
    const rows = await prisma.dailyAction.findMany({
      where: { userId, generatedForDate: { gte: since }, ...(projectId ? { projectId } : {}) },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toDailyActionRecord(r as StoredDailyAction));
  }

  async findById(id: string, userId?: string): Promise<DailyActionRecord | null> {
    const row = await prisma.dailyAction.findUnique({
      where: userId ? { id, userId } : { id },
    });
    return row ? toDailyActionRecord(row as StoredDailyAction) : null;
  }

  async complete(
    id: string,
    userId: string,
    feedback: string | null,
    outcomeId: string | null,
  ): Promise<DailyActionRecord> {
    const updated = await prisma.dailyAction.update({
      where: { id, userId },
      data: { status: "DONE", completedAt: new Date(), feedback, outcomeId },
    });
    return toDailyActionRecord(updated as StoredDailyAction);
  }

  async skip(id: string, userId: string, reason: string | null): Promise<DailyActionRecord> {
    const updated = await prisma.dailyAction.update({
      where: { id, userId },
      data: { status: "SKIPPED", skippedAt: new Date(), feedback: reason },
    });
    return toDailyActionRecord(updated as StoredDailyAction);
  }

  async setOutcome(id: string, userId: string, outcomeId: string): Promise<DailyActionRecord> {
    const updated = await prisma.dailyAction.update({
      where: { id, userId },
      data: { outcomeId },
    });
    return toDailyActionRecord(updated as StoredDailyAction);
  }
}

type StoredActionOutcome = {
  id: string;
  actionId: string;
  userId: string;
  projectId: string | null;
  metricName: string | null;
  metricBefore: unknown;
  metricAfter: unknown;
  observationWindowHours: number;
  measuredAt: Date | null;
  status: ActionOutcomeStatus;
  createdAt: Date;
  updatedAt: Date;
};

function toActionOutcomeRecord(row: StoredActionOutcome): ActionOutcomeRecord {
  return { ...row };
}

export class PrismaActionOutcomeRepository implements ActionOutcomeRepository {
  async save(outcome: Omit<ActionOutcomeRecord, "id" | "createdAt" | "updatedAt">): Promise<ActionOutcomeRecord> {
    const created = await prisma.actionOutcome.create({
      data: outcome as unknown as Prisma.ActionOutcomeCreateInput,
    });
    return toActionOutcomeRecord(created as StoredActionOutcome);
  }

  async findByAction(actionId: string, userId: string): Promise<ActionOutcomeRecord | null> {
    const row = await prisma.actionOutcome.findUnique({ where: { actionId, userId } });
    return row ? toActionOutcomeRecord(row as StoredActionOutcome) : null;
  }

  async findById(id: string, userId: string): Promise<ActionOutcomeRecord | null> {
    const row = await prisma.actionOutcome.findUnique({ where: { id, userId } });
    return row ? toActionOutcomeRecord(row as StoredActionOutcome) : null;
  }

  async updateMeasured(
    id: string,
    userId: string,
    metricAfter: unknown,
    status: ActionOutcomeStatus,
    measuredAt: Date,
  ): Promise<ActionOutcomeRecord> {
    const updated = await prisma.actionOutcome.update({
      where: { id, userId },
      data: { metricAfter: (metricAfter ?? Prisma.JsonNull) as Prisma.InputJsonValue, status, measuredAt },
    });
    return toActionOutcomeRecord(updated as StoredActionOutcome);
  }

  async listPendingDue(userId: string, projectId?: string, limit = 50): Promise<ActionOutcomeRecord[]> {
    const rows = await prisma.actionOutcome.findMany({
      where: { userId, status: "PENDING", ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map((r) => toActionOutcomeRecord(r as StoredActionOutcome));
  }
}

type StoredJourneyStep = {
  id: string;
  journeyId: string;
  type: string;
  externalId: string | null;
  channel: string | null;
  details: unknown;
  occurredAt: Date;
  createdAt: Date;
};

type StoredJourney = {
  id: string;
  userId: string;
  projectId: string;
  customerId: string | null;
  externalUserId: string | null;
  channel: string | null;
  outcome: string;
  attributedRevenue: number | null;
  attributedPostId: string | null;
  createdAt: Date;
  updatedAt: Date;
  steps?: StoredJourneyStep[];
};

function toJourneyStepRecord(row: StoredJourneyStep): JourneyStepRecord {
  return { ...row, type: row.type as JourneyStepRecord["type"] };
}

function toJourneyRecord(row: StoredJourney): JourneyRecord {
  return {
    ...row,
    outcome: row.outcome as JourneyOutcome,
    steps: (row.steps ?? []).map(toJourneyStepRecord),
  };
}

export class PrismaJourneyRepository implements JourneyRepository {
  async findOpen(
    userId: string,
    projectId: string,
    key: { customerId?: string | null; externalUserId?: string | null },
  ): Promise<JourneyRecord | null> {
    if (!key.customerId && !key.externalUserId) return null;
    const row = await prisma.journey.findFirst({
      where: {
        userId,
        projectId,
        outcome: { notIn: ["PURCHASE", "CHURNED"] },
        ...(key.customerId ? { customerId: key.customerId } : {}),
        ...(key.externalUserId ? { externalUserId: key.externalUserId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { steps: { orderBy: { occurredAt: "asc" } } },
    });
    return row ? toJourneyRecord(row as StoredJourney) : null;
  }

  async create(journey: {
    userId: string;
    projectId: string;
    customerId: string | null;
    externalUserId: string | null;
    channel: string | null;
    outcome: JourneyOutcome;
  }): Promise<JourneyRecord> {
    const created = await prisma.journey.create({
      data: journey,
      include: { steps: { orderBy: { occurredAt: "asc" } } },
    });
    return toJourneyRecord(created as StoredJourney);
  }

  async appendStep(
    journeyId: string,
    userId: string,
    step: Omit<JourneyStepRecord, "id" | "journeyId" | "createdAt">,
    update: { outcome?: JourneyOutcome; attributedRevenue?: number | null; attributedPostId?: string | null },
  ): Promise<JourneyRecord> {
    await prisma.journeyStep.create({
      data: {
        journeyId,
        type: step.type,
        externalId: step.externalId,
        channel: step.channel,
        details: (step.details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        occurredAt: step.occurredAt,
      },
    });
    const updated = await prisma.journey.update({
      where: { id: journeyId, userId },
      data: {
        ...(update.outcome ? { outcome: update.outcome } : {}),
        ...(update.attributedRevenue !== undefined ? { attributedRevenue: update.attributedRevenue } : {}),
        ...(update.attributedPostId !== undefined ? { attributedPostId: update.attributedPostId } : {}),
      },
      include: { steps: { orderBy: { occurredAt: "asc" } } },
    });
    return toJourneyRecord(updated as StoredJourney);
  }

  async findById(id: string, userId: string): Promise<JourneyRecord | null> {
    const row = await prisma.journey.findUnique({
      where: { id, userId },
      include: { steps: { orderBy: { occurredAt: "asc" } } },
    });
    return row ? toJourneyRecord(row as StoredJourney) : null;
  }

  async list(userId: string, projectId?: string, limit = 50): Promise<JourneyRecord[]> {
    const rows = await prisma.journey.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { steps: { orderBy: { occurredAt: "asc" } } },
    });
    return rows.map((r) => toJourneyRecord(r as StoredJourney));
  }

  async search(
    userId: string,
    query: { projectId?: string; externalUserId?: string; customerId?: string; postId?: string; couponCode?: string },
    limit = 50,
  ): Promise<JourneyRecord[]> {
    const stepFilters: Prisma.JourneyStepWhereInput[] = [];
    if (query.postId) stepFilters.push({ type: "POST_VIEW", externalId: query.postId });
    if (query.couponCode) stepFilters.push({ type: "COUPON_SENT", externalId: query.couponCode });
    const rows = await prisma.journey.findMany({
      where: {
        userId,
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.externalUserId ? { externalUserId: query.externalUserId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.postId ? { attributedPostId: query.postId } : {}),
        ...(stepFilters.length > 0 ? { steps: { some: { OR: stepFilters } } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { steps: { orderBy: { occurredAt: "asc" } } },
    });
    return rows.map((r) => toJourneyRecord(r as StoredJourney));
  }
}

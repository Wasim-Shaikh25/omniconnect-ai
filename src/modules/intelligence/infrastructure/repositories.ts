import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  SignalRepository,
  EntityLinkRepository,
  DataQualityRepository,
  MetricRepository,
  BusinessInsightRepository,
  RecommendationRepository,
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
} from "../domain/types";

type StoredSignal = {
  id: string;
  organizationId: string;
  storeId: string;
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
    organizationId: string,
    subjectType: string,
    subjectId: string,
    limit = 100,
  ): Promise<SignalRecord[]> {
    const rows = await prisma.signal.findMany({
      where: {
        organizationId,
        subjectType,
        subjectId,
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toSignalRecord(r as StoredSignal));
  }

  async listByStore(storeId: string, limit = 100): Promise<SignalRecord[]> {
    const rows = await prisma.signal.findMany({
      where: { storeId },
      orderBy: { ingestedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toSignalRecord(r as StoredSignal));
  }

  async getLatestBySubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
    eventType: string,
  ): Promise<SignalRecord | null> {
    const row = await prisma.signal.findFirst({
      where: {
        organizationId,
        subjectType,
        subjectId,
        eventType,
      },
      orderBy: { occurredAt: "desc" },
    });
    return row ? toSignalRecord(row as StoredSignal) : null;
  }

  async listByRelatedEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<SignalRecord[]> {
    const rows = await prisma.signal.findMany({
      where: { organizationId },
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
  organizationId: string;
  storeId: string | null;
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

  async listForOrganization(organizationId: string, limit = 100): Promise<EntityLinkRecord[]> {
    const rows = await prisma.entityLink.findMany({
      where: { organizationId },
      take: limit,
    });
    return rows.map((r) => r as StoredLink);
  }

  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    activeOnly = true,
  ): Promise<EntityLinkRecord[]> {
    const rows = await prisma.entityLink.findMany({
      where: {
        organizationId,
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { targetType: entityType, targetId: entityId },
        ],
        ...(activeOnly ? { status: "ACTIVE" } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows as StoredLink[];
  }

  async findById(id: string): Promise<EntityLinkRecord | null> {
    const row = await prisma.entityLink.findUnique({ where: { id } });
    return (row as StoredLink) ?? null;
  }

  async findBetween(
    organizationId: string,
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
  ): Promise<EntityLinkRecord | null> {
    const row = await prisma.entityLink.findFirst({
      where: {
        organizationId,
        sourceType,
        sourceId,
        targetType,
        targetId,
      },
    });
    return (row as StoredLink) ?? null;
  }

  async updateStatus(id: string, status: EntityLinkRecord["status"]): Promise<EntityLinkRecord> {
    const data: Prisma.EntityLinkUpdateInput = { status };
    const updated = await prisma.entityLink.update({ where: { id }, data });
    return updated as StoredLink;
  }

  async updateConfidence(
    id: string,
    confidence: EntityLinkRecord["confidence"],
    resolutionMethod: string,
  ): Promise<EntityLinkRecord> {
    const data: Prisma.EntityLinkUpdateInput = { confidence, resolutionMethod };
    const updated = await prisma.entityLink.update({ where: { id }, data });
    return updated as StoredLink;
  }
}

type StoredIssue = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async listOpen(organizationId: string, storeId?: string): Promise<DataQualityIssueRecord[]> {
    const rows = await prisma.dataQualityIssue.findMany({
      where: {
        organizationId,
        status: "OPEN",
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { detectedAt: "desc" },
    });
    return rows as StoredIssue[];
  }

  async listByStore(storeId: string, limit = 50): Promise<DataQualityIssueRecord[]> {
    const rows = await prisma.dataQualityIssue.findMany({
      where: { storeId },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
    return rows as StoredIssue[];
  }

  async updateStatus(id: string, status: DataQualityIssueRecord["status"]): Promise<DataQualityIssueRecord> {
    const data: Prisma.DataQualityIssueUpdateInput = { status };
    if (status === "RESOLVED") data.resolvedAt = new Date();
    const updated = await prisma.dataQualityIssue.update({ where: { id }, data });
    return updated as StoredIssue;
  }
}

type StoredMetricDefinition = {
  id: string;
  organizationId: string | null;
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
  organizationId: string;
  storeId: string | null;
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

  async findDefinition(organizationId: string | null, name: string): Promise<MetricDefinitionRecord | null> {
    const row = await prisma.metricDefinition.findFirst({
      where: { organizationId, name },
    });
    return (row as StoredMetricDefinition) ?? null;
  }

  async listDefinitions(organizationId: string | null): Promise<MetricDefinitionRecord[]> {
    const rows = await prisma.metricDefinition.findMany({
      where: { organizationId },
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
    organizationId: string,
    storeId: string | null,
  ): Promise<MetricSnapshotRecord | null> {
    const row = await prisma.metricSnapshot.findFirst({
      where: {
        definitionId,
        organizationId,
        storeId,
      },
      orderBy: { computedAt: "desc" },
    });
    return row ? toMetricSnapshotRecord(row as StoredMetricSnapshot) : null;
  }
}

type StoredBusinessInsight = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async listOpen(organizationId: string, storeId?: string, limit = 50): Promise<BusinessInsightRecord[]> {
    const rows = await prisma.businessInsight.findMany({
      where: {
        organizationId,
        status: "OPEN",
        ...(storeId ? { storeId } : {}),
      },
      orderBy: [{ severity: "desc" }, { generatedAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toInsightRecord(r as StoredBusinessInsight));
  }

  async findById(id: string): Promise<BusinessInsightRecord | null> {
    const row = await prisma.businessInsight.findUnique({ where: { id } });
    return row ? toInsightRecord(row as StoredBusinessInsight) : null;
  }

  async updateStatus(id: string, status: BusinessInsightRecord["status"]): Promise<BusinessInsightRecord> {
    const data: Prisma.BusinessInsightUpdateInput = { status };
    if (status === "DISMISSED") data.dismissedAt = new Date();
    if (status !== "SNOOZED") data.snoozedUntil = null;
    const updated = await prisma.businessInsight.update({ where: { id }, data });
    return toInsightRecord(updated as StoredBusinessInsight);
  }
}

type StoredRecommendation = {
  id: string;
  organizationId: string;
  storeId: string | null;
  insightId: string | null;
  producedByModule: string;
  producedByService: string | null;
  title: string;
  description: string;
  objective: string | null;
  reasonCodes: string[];
  impactRange: unknown;
  confidence: number | null;
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

  async listOpen(organizationId: string, storeId?: string, limit = 50): Promise<RecommendationRecord[]> {
    const rows = await prisma.recommendation.findMany({
      where: {
        organizationId,
        status: { in: ["PROPOSED", "ACCEPTED", "EDITED"] },
        ...(storeId ? { storeId } : {}),
      },
      orderBy: [{ generatedAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toRecommendationRecord(r as StoredRecommendation));
  }

  async listActive(organizationId: string, storeId?: string, limit = 50): Promise<RecommendationRecord[]> {
    const now = new Date();
    const rows = await prisma.recommendation.findMany({
      where: {
        organizationId,
        status: { in: ["PROPOSED", "ACCEPTED", "EDITED"] },
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        invalidatedAt: null,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: [{ generatedAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => toRecommendationRecord(r as StoredRecommendation));
  }

  async findById(id: string): Promise<RecommendationRecord | null> {
    const row = await prisma.recommendation.findUnique({ where: { id } });
    return row ? toRecommendationRecord(row as StoredRecommendation) : null;
  }

  async updateStatus(id: string, status: RecommendationStatus): Promise<RecommendationRecord> {
    const data: Prisma.RecommendationUpdateInput = { status };
    if (status === "DISMISSED") data.dismissedAt = new Date();
    if (status !== "SNOOZED") data.snoozedUntil = null;
    if (status === "EXPIRED") data.invalidatedAt = new Date();
    const updated = await prisma.recommendation.update({ where: { id }, data });
    return toRecommendationRecord(updated as StoredRecommendation);
  }

  async invalidate(id: string, eventName: string): Promise<RecommendationRecord> {
    const data: Prisma.RecommendationUpdateInput = {
      status: "EXPIRED",
      invalidatedAt: new Date(),
      invalidatedByEvent: eventName,
    };
    const updated = await prisma.recommendation.update({ where: { id }, data });
    return toRecommendationRecord(updated as StoredRecommendation);
  }
}

type StoredActionPlan = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async findById(id: string): Promise<ActionPlanRecord | null> {
    const row = await prisma.actionPlan.findUnique({ where: { id } });
    return row ? toActionPlanRecord(row as StoredActionPlan) : null;
  }

  async updateStatus(
    id: string,
    status: ActionPlanStatus,
    approvedBy?: string | null,
    executedAt?: Date | null,
    stoppedAt?: Date | null,
  ): Promise<ActionPlanRecord> {
    const data: Prisma.ActionPlanUpdateInput = { status };
    if (approvedBy !== undefined) data.approvedBy = approvedBy;
    if (executedAt !== undefined) data.executedAt = executedAt ?? null;
    if (stoppedAt !== undefined) data.stoppedAt = stoppedAt ?? null;
    const updated = await prisma.actionPlan.update({ where: { id }, data });
    return toActionPlanRecord(updated as StoredActionPlan);
  }
}

type StoredDecision = {
  id: string;
  organizationId: string;
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

  async listByActionPlan(actionPlanId: string): Promise<DecisionRecord[]> {
    const rows = await prisma.decision.findMany({
      where: { actionPlanId },
      orderBy: { decidedAt: "desc" },
    });
    return rows as StoredDecision[];
  }
}

type StoredOutcome = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async findByActionPlan(actionPlanId: string): Promise<OutcomeRecord | null> {
    const row = await prisma.outcome.findFirst({ where: { actionPlanId } });
    return (row as StoredOutcome) ?? null;
  }

  async findById(id: string): Promise<OutcomeRecord | null> {
    const row = await prisma.outcome.findUnique({ where: { id } });
    return (row as StoredOutcome) ?? null;
  }

  async list(organizationId: string, storeId?: string, limit = 20): Promise<OutcomeRecord[]> {
    const rows = await prisma.outcome.findMany({
      where: {
        organizationId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });
    return rows.map((r) => r as StoredOutcome);
  }

  async updateMeasured(
    id: string,
    beforeValue: number | null,
    afterValue: number | null,
    status: OutcomeStatus,
    measuredAt: Date,
  ): Promise<OutcomeRecord> {
    const updated = await prisma.outcome.update({
      where: { id },
      data: { beforeValue, afterValue, status, measuredAt },
    });
    return updated as StoredOutcome;
  }
}

type StoredGoal = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async list(organizationId: string, storeId?: string, limit = 50): Promise<GoalRecord[]> {
    const rows = await prisma.goal.findMany({
      where: {
        organizationId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toGoalRecord(r as StoredGoal));
  }

  async findById(id: string): Promise<GoalRecord | null> {
    const row = await prisma.goal.findUnique({ where: { id } });
    return row ? toGoalRecord(row as StoredGoal) : null;
  }

  async updatePacing(id: string, pacing: GoalRecord["pacing"], status?: GoalStatus): Promise<GoalRecord> {
    const data: Prisma.GoalUpdateInput = {
      pacing: (pacing ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
    };
    if (status) data.status = status;
    const updated = await prisma.goal.update({ where: { id }, data });
    return toGoalRecord(updated as StoredGoal);
  }
}

type StoredPrediction = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async listActive(organizationId: string, storeId?: string, limit = 50): Promise<PredictionRecord[]> {
    const rows = await prisma.prediction.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        expiresAt: { gte: new Date() },
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toPredictionRecord(r as StoredPrediction));
  }

  async findById(id: string): Promise<PredictionRecord | null> {
    const row = await prisma.prediction.findUnique({ where: { id } });
    return row ? toPredictionRecord(row as StoredPrediction) : null;
  }

  async expire(id: string): Promise<PredictionRecord> {
    const updated = await prisma.prediction.update({ where: { id }, data: { status: "EXPIRED" } });
    return toPredictionRecord(updated as StoredPrediction);
  }
}

type StoredHypothesis = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async list(organizationId: string, storeId?: string, limit = 50): Promise<HypothesisRecord[]> {
    const rows = await prisma.hypothesis.findMany({
      where: { organizationId, ...(storeId ? { storeId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toHypothesisRecord(r as StoredHypothesis));
  }

  async findById(id: string): Promise<HypothesisRecord | null> {
    const row = await prisma.hypothesis.findUnique({ where: { id } });
    return row ? toHypothesisRecord(row as StoredHypothesis) : null;
  }

  async updateStatus(id: string, status: HypothesisStatus, validatedAt?: Date | null): Promise<HypothesisRecord> {
    const data: Prisma.HypothesisUpdateInput = { status };
    if (validatedAt !== undefined) data.validatedAt = validatedAt ?? null;
    const updated = await prisma.hypothesis.update({ where: { id }, data });
    return toHypothesisRecord(updated as StoredHypothesis);
  }
}

type StoredBusinessLearning = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async findByRule(organizationId: string, ruleName: string, storeId?: string): Promise<BusinessLearningRecord | null> {
    const row = await prisma.businessLearning.findFirst({
      where: { organizationId, ruleName, ...(storeId ? { storeId } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return row ? toBusinessLearningRecord(row as StoredBusinessLearning) : null;
  }

  async list(organizationId: string, storeId?: string, limit = 50): Promise<BusinessLearningRecord[]> {
    const rows = await prisma.businessLearning.findMany({
      where: { organizationId, ...(storeId ? { storeId } : {}) },
      orderBy: { weight: "desc" },
      take: limit,
    });
    return rows.map((r) => toBusinessLearningRecord(r as StoredBusinessLearning));
  }

  async updateOutcome(id: string, success: boolean, weightDelta: number, lastOutcomeAt: Date): Promise<BusinessLearningRecord> {
    const existing = await prisma.businessLearning.findUnique({ where: { id } });
    if (!existing) throw new Error("BusinessLearning record not found");
    const data: Prisma.BusinessLearningUpdateInput = {
      weight: existing.weight + weightDelta,
      successCount: existing.successCount + (success ? 1 : 0),
      failureCount: existing.failureCount + (success ? 0 : 1),
      lastOutcomeAt,
    };
    const updated = await prisma.businessLearning.update({ where: { id }, data });
    return toBusinessLearningRecord(updated as StoredBusinessLearning);
  }
}

type StoredCompetitorInsight = {
  id: string;
  organizationId: string;
  storeId: string | null;
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

  async list(organizationId: string, storeId?: string, limit = 50): Promise<CompetitorInsightRecord[]> {
    const rows = await prisma.competitorInsight.findMany({
      where: { organizationId, ...(storeId ? { storeId } : {}) },
      orderBy: { capturedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toCompetitorInsightRecord(r as StoredCompetitorInsight));
  }

  async findById(id: string): Promise<CompetitorInsightRecord | null> {
    const row = await prisma.competitorInsight.findUnique({ where: { id } });
    return row ? toCompetitorInsightRecord(row as StoredCompetitorInsight) : null;
  }
}

type StoredPortfolioSnapshot = {
  id: string;
  organizationId: string;
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

  async findLatest(organizationId: string): Promise<PortfolioSnapshotRecord | null> {
    const row = await prisma.portfolioSnapshot.findFirst({
      where: { organizationId },
      orderBy: { generatedAt: "desc" },
    });
    return row ? toPortfolioSnapshotRecord(row as StoredPortfolioSnapshot) : null;
  }

  async list(organizationId: string, limit = 10): Promise<PortfolioSnapshotRecord[]> {
    const rows = await prisma.portfolioSnapshot.findMany({
      where: { organizationId },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toPortfolioSnapshotRecord(r as StoredPortfolioSnapshot));
  }
}

type StoredSystemMetric = {
  id: string;
  organizationId: string;
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

  async list(organizationId: string, operation?: string, limit = 50): Promise<SystemMetricRecord[]> {
    const rows = await prisma.systemMetric.findMany({
      where: { organizationId, ...(operation ? { operation } : {}) },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toSystemMetricRecord(r as StoredSystemMetric));
  }

  async summary(organizationId: string): Promise<{ avgLatencyMs: number | null; totalCostCents: number | null; operationCount: number; slowestOperation: string | null }> {
    const rows = await prisma.systemMetric.findMany({
      where: { organizationId },
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
    organizationId: string,
    storeId: string | null,
    period: KpiSnapshot["period"],
    now: Date = new Date(),
  ): Promise<KpiSnapshot> {
    const since = new Date(now.getTime() - PERIOD_MS[period]);

    const storeFilter = storeId ? { storeId } : {};

    const [
      signals,
      insights,
      recommendations,
      actionPlans,
      outcomes,
      links,
    ] = await Promise.all([
      prisma.signal.findMany({
        where: { organizationId, ...storeFilter, occurredAt: { gte: since } },
        orderBy: { occurredAt: "desc" },
        take: 10000,
      }),
      prisma.businessInsight.findMany({
        where: { organizationId, ...storeFilter, generatedAt: { gte: since } },
        take: 10000,
      }),
      prisma.recommendation.findMany({
        where: { organizationId, ...storeFilter, generatedAt: { gte: since } },
        take: 10000,
      }),
      prisma.actionPlan.findMany({
        where: { organizationId, ...storeFilter, createdAt: { gte: since } },
        take: 10000,
      }),
      prisma.outcome.findMany({
        where: { organizationId, ...storeFilter, createdAt: { gte: since } },
        take: 10000,
      }),
      prisma.entityLink.findMany({
        where: { organizationId, ...(storeId ? { storeId } : {}) },
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
      organizationId,
      storeId: storeId ?? undefined,
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
  organizationId: string;
  storeId: string | null;
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
    organizationId: string,
    storeId?: string,
    limit = 10,
  ): Promise<RecommendationConflictRecord[]> {
    const rows = await prisma.recommendationConflict.findMany({
      where: {
        organizationId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { resolvedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toRecommendationConflictRecord(r as StoredRecommendationConflict));
  }
}

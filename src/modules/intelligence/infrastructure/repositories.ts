import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  SignalRepository,
  EntityLinkRepository,
  DataQualityRepository,
  MetricRepository,
} from "../application/ports";
import type {
  SignalRecord,
  EntityLinkRecord,
  DataQualityIssueRecord,
  MetricDefinitionRecord,
  MetricSnapshotRecord,
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

import type {
  SignalRecord,
  EntityLinkRecord,
  DataQualityIssueRecord,
  MetricDefinitionRecord,
  MetricSnapshotRecord,
  ConfidenceLevel,
  LinkStatus,
  DataQualityStatus,
  DataQualitySeverity,
  MetricSnapshotStatus,
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

export type { SignalRecord, EntityLinkRecord, DataQualityIssueRecord, MetricDefinitionRecord, MetricSnapshotRecord, ConfidenceLevel, LinkStatus, DataQualityStatus, DataQualitySeverity, MetricSnapshotStatus };

export type ConfidenceLevel = "VERIFIED" | "PROBABLE" | "POSSIBLE" | "REJECTED";

export type LinkStatus = "ACTIVE" | "PENDING" | "REVOKED";

export type DataQualitySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DataQualityStatus = "OPEN" | "RESOLVED" | "IGNORED";

export type MetricSnapshotStatus = "FRESH" | "STALE" | "MISSING";

export type JourneyStage =
  | "Discovery"
  | "Engagement"
  | "Consideration"
  | "Purchase"
  | "Fulfillment"
  | "Retention"
  | "Advocacy";

export interface SignalRecord {
  id: string;
  organizationId: string;
  storeId: string;
  eventType: string;
  schemaVersion: number;
  subjectType: string;
  subjectId: string;
  stage: JourneyStage | null;
  relatedEntities: Array<{ type: string; id: string; confidence?: ConfidenceLevel }>;
  data: unknown;
  lineage: unknown;
  source: string;
  occurredAt: Date;
  ingestedAt: Date;
  freshnessMs: number | null;
  qualityStatus: string | null;
  quarantineReason: string | null;
  traceId: string | null;
}

export interface EntityLinkRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType: string;
  confidence: ConfidenceLevel;
  resolutionMethod: string | null;
  status: LinkStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataQualityIssueRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  source: string;
  entityType: string | null;
  entityId: string | null;
  metricName: string | null;
  severity: DataQualitySeverity;
  impact: string | null;
  status: DataQualityStatus;
  detectedAt: Date;
  resolvedAt: Date | null;
}

export interface MetricDefinitionRecord {
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
}

export interface MetricSnapshotRecord {
  id: string;
  definitionId: string;
  organizationId: string;
  storeId: string | null;
  value: number | null;
  dimensions: Record<string, string> | null;
  periodStart: Date;
  periodEnd: Date;
  status: MetricSnapshotStatus;
  sourceIds: string[];
  computedAt: Date;
}

export interface TimelineEvent {
  id: string;
  type: string;
  stage: JourneyStage | null;
  title: string;
  description: string | null;
  timestamp: Date;
  source: string;
  confidence: ConfidenceLevel | null;
  relatedEntities: Array<{ type: string; id: string; label?: string }>;
  deepLink: string | null;
}

export interface CustomerIntelligenceSummary {
  customerId: string;
  storeId: string;
  displayName: string;
  lifecycleStage: string;
  consent: string;
  engagementScore: number;
  leadScore: number;
  segment: string;
  confidence: ConfidenceLevel;
  bestNextAction: string | null;
  risks: string[];
  opportunities: string[];
  preferredChannel: string | null;
  lastActivityAt: Date | null;
  links: EntityLinkRecord[];
  linkedEntities: Array<{ type: string; id: string; label: string; confidence: ConfidenceLevel }>;
}

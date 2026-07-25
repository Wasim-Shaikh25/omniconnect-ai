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

export type InsightType = "ANOMALY" | "OPPORTUNITY" | "RISK" | "INFO";

export type InsightSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type InsightStatus = "OPEN" | "DISMISSED" | "SNOOZED" | "RESOLVED";

export interface BusinessInsightEvidence {
  signalIds: string[];
  metricIds: string[];
  summary: string;
}

export interface BusinessInsightRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  type: InsightType;
  severity: InsightSeverity;
  status: InsightStatus;
  title: string;
  description: string;
  evidence: BusinessInsightEvidence | null;
  deepLink: string | null;
  generatedAt: Date;
  dismissedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RecommendationStatus = "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "SNOOZED" | "EXPIRED";

export type RiskTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

export type ActionPlanStatus = "DRAFT" | "APPROVED" | "EXECUTED" | "FAILED" | "STOPPED";

export type DecisionType = "APPROVED" | "EDITED" | "ASSIGNED" | "SNOOZED" | "REJECTED" | "EXPIRED";

export type OutcomeStatus = "PENDING" | "SUCCESS" | "PARTIAL" | "FAILURE" | "ABORTED";

export type GoalStatus = "ACTIVE" | "PAUSED" | "ACHIEVED" | "MISSED" | "ABANDONED";

export interface RecommendationImpactRange {
  min: number;
  max: number;
  unit?: string;
}

export interface RecommendationRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  insightId: string | null;
  title: string;
  description: string;
  objective: string | null;
  reasonCodes: string[];
  impactRange: RecommendationImpactRange | null;
  confidence: number | null;
  effort: string | null;
  urgency: string | null;
  riskTier: RiskTier;
  eligibility: unknown;
  status: RecommendationStatus;
  actionType: string;
  actionParams: unknown;
  deepLink: string | null;
  generatedAt: Date;
  dismissedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionPlanRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  recommendationId: string | null;
  title: string;
  steps: unknown;
  targetMetric: string | null;
  expectedImpact: RecommendationImpactRange | null;
  status: ActionPlanStatus;
  approvedBy: string | null;
  executedAt: Date | null;
  stoppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecisionRecord {
  id: string;
  organizationId: string;
  actionPlanId: string;
  recommendationId: string | null;
  decisionType: DecisionType;
  reason: string | null;
  decidedBy: string;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutcomeRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  actionPlanId: string;
  metricName: string | null;
  beforeValue: number | null;
  afterValue: number | null;
  observationWindowDays: number;
  measuredAt: Date | null;
  status: OutcomeStatus;
  attribution: string | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalPacing {
  current: number;
  projected: number;
  onTrack: boolean;
}

export interface GoalRecord {
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
  pacing: GoalPacing | null;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

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
  producedByModule: string;
  producedByService: string | null;
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
  validFrom: Date;
  validUntil: Date | null;
  invalidatedAt: Date | null;
  invalidatedByEvent: string | null;
  generatedAt: Date;
  dismissedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationConflictRecord {
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

export type PredictionType = "CHURN" | "STOCK_OUT" | "PURCHASE_PROPENSITY" | "REVENUE_FORECAST";
export type PredictionStatus = "ACTIVE" | "EXPIRED" | "ABSTAINED";
export type HypothesisStatus = "PROPOSED" | "VALIDATED" | "REFUTED";

export interface PredictionRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  predictionType: PredictionType;
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
  status: PredictionStatus;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HypothesisRecord {
  id: string;
  organizationId: string;
  storeId: string | null;
  insightId: string | null;
  statement: string;
  features: unknown;
  expectedOutcome: string | null;
  status: HypothesisStatus;
  validatedAt: Date | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessLearningRecord {
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
}

export interface CompetitorInsightRecord {
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
}

export interface PortfolioSnapshotRecord {
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
}

export interface SystemMetricRecord {
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
}

export interface ProductScoreRecord {
  productId: string;
  productTitle: string;
  contentScore: number;
  engagementScore: number;
  conversationScore: number;
  salesScore: number;
  trendScore: number;
  competitorScore: number;
  compositeScore: number;
  evidence: string;
}

export interface ConversationPattern {
  category: string;
  frequency: number;
  samplePhrases: string[];
}

export interface TrendingHashtag {
  tag: string;
  postCount: number;
  engagement: number;
}

export interface CompetitorChange {
  trackedAccountId: string;
  handle: string;
  changeType: string;
  detectedAt: Date;
}

export interface MarketingMemoryRecord {
  organizationId: string;
  storeId: string;
  generatedAt: Date;
  followerCount: number;
  productScores: ProductScoreRecord[];
  topPerformingPosts: { id: string; title: string; engagement: number }[];
  dmPatterns: ConversationPattern[];
  commentPatterns: ConversationPattern[];
  trendingHashtags: TrendingHashtag[];
  winningPostingTimes: { dayOfWeek: string; hour: number; engagementScore: number }[];
  customerObjections: { phrase: string; frequency: number }[];
  competitorChanges: CompetitorChange[];
  campaignHistory: { campaignId: string; name: string; outcome: string }[];
}

export interface DailyBriefSection {
  title: string;
  value: string | number;
  change?: string;
  detail?: string;
  cta?: { label: string; href: string };
}

export interface DailyBriefRecord {
  organizationId: string;
  storeId: string;
  generatedAt: Date;
  sections: DailyBriefSection[];
  contentIdea: string | null;
  recommendedProductId: string | null;
  recommendedProductTitle: string | null;
  bestPostingTime: string | null;
  trendingAudio: string | null;
  trendingHashtags: string[];
  expectedReach: number | null;
  expectedSales: number | null;
  priorities: string[];
}

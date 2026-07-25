/**
 * Intelligence module — public barrel.
 *
 * Implements Phase 1 of the Unified Intelligence Layer: canonical signal
 * ingestion, entity-link resolution, unified timeline, shared semantic
 * metrics, and data-quality/freshness indicators.
 */
export const MODULE_NAME = "intelligence" as const;

export type {
  SignalRecord,
  EntityLinkRecord,
  DataQualityIssueRecord,
  MetricDefinitionRecord,
  MetricSnapshotRecord,
  TimelineEvent,
  CustomerIntelligenceSummary,
  BusinessInsightRecord,
  BusinessInsightEvidence,
  RecommendationRecord,
  ActionPlanRecord,
  OutcomeRecord,
  GoalRecord,
  PredictionRecord,
  HypothesisRecord,
  BusinessLearningRecord,
  CompetitorInsightRecord,
  PortfolioSnapshotRecord,
  SystemMetricRecord,
  JourneyStage,
  ConfidenceLevel,
  LinkStatus,
  DataQualitySeverity,
  DataQualityStatus,
  MetricSnapshotStatus,
  InsightType,
  InsightSeverity,
  InsightStatus,
  RecommendationStatus,
  ActionPlanStatus,
  OutcomeStatus,
  GoalStatus,
  PredictionType,
  PredictionStatus,
  HypothesisStatus,
  RiskTier,
} from "./domain/types";

export type { IngestSignalInput } from "./application/signal-ingestion";
export type { TimelineQuery } from "./application/timeline";
export type {
  InboxNextBestAction,
  OrdersNextBestAction,
  CustomerNextBestAction,
  ContentNextBestAction,
  CampaignsNextBestAction,
  BrandDealNextBestAction,
  CompetitorNextBestAction,
} from "./application/next-best-action";

export {
  signalIngestionService,
  entityResolutionService,
  timelineService,
  metricService,
  dataQualityService,
  customerSummaryService,
  detectionService,
  intelligenceFeedService,
  recommendationService,
  actionPlanService,
  decisionPolicyService,
  outcomeService,
  businessLearningService,
  goalService,
  predictionService,
  hypothesisService,
  portfolioService,
  competitorIntelligenceService,
  costLatencyMonitor,
  nextBestActionService,
  proactiveNotificationService,
  goalAutomationService,
  kpiService,
} from "./infrastructure/container";

export {
  getCustomerTimelineAction,
  getCustomerIntelligenceAction,
  getDataQualityIssuesAction,
  getMetricAction,
  getIntelligenceFeedAction,
  dismissInsightAction,
  getRecommendationsAction,
  approveRecommendationAction,
  executeActionPlanAction,
  dismissRecommendationAction,
  getGoalsAction,
  createGoalAction,
  getPredictionsAction,
  getHypothesesAction,
  getBusinessLearningAction,
  getAgencyPortfolioAction,
  getCompetitorIntelligenceAction,
  getSystemHealthAction,
  getInboxNextBestActionAction,
  getOrdersNextBestActionAction,
  getCrmNextBestActionAction,
  getContentNextBestActionAction,
  getCampaignsNextBestActionAction,
  getBrandDealsNextBestActionAction,
  getCompetitorNextBestActionAction,
  getStoreMetricsAction,
  getAutomationTemplatesAction,
  createGoalAutomationAction,
  getWorkspaceKpisAction,
  mergeEntityAction,
  splitEntityAction,
} from "./presentation/actions";

export type { IntelligenceActionState } from "./presentation/actions";

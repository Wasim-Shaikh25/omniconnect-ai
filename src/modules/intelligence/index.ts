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
  JourneyStage,
  ConfidenceLevel,
  LinkStatus,
  DataQualitySeverity,
  DataQualityStatus,
  MetricSnapshotStatus,
  InsightType,
  InsightSeverity,
  InsightStatus,
} from "./domain/types";

export type { IngestSignalInput } from "./application/signal-ingestion";
export type { TimelineQuery } from "./application/timeline";

export {
  signalIngestionService,
  entityResolutionService,
  timelineService,
  metricService,
  dataQualityService,
  customerSummaryService,
  detectionService,
  intelligenceFeedService,
} from "./infrastructure/container";

export {
  getCustomerTimelineAction,
  getCustomerIntelligenceAction,
  getDataQualityIssuesAction,
  getMetricAction,
  getIntelligenceFeedAction,
  dismissInsightAction,
  mergeEntityAction,
  splitEntityAction,
} from "./presentation/actions";

export type { IntelligenceActionState } from "./presentation/actions";

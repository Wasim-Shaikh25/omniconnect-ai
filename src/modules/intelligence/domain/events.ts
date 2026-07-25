import { BaseDomainEvent } from "@/shared/kernel";
import type {
  SignalRecord,
  DataQualityIssueRecord,
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
} from "./types";

export interface SignalIngestedPayload {
  signal: SignalRecord;
}

export class SignalIngested extends BaseDomainEvent<SignalIngestedPayload> {
  readonly name = "SignalIngested";
}

export interface DataQualityIssueDetectedPayload {
  issue: DataQualityIssueRecord;
}

export class DataQualityIssueDetected extends BaseDomainEvent<DataQualityIssueDetectedPayload> {
  readonly name = "DataQualityIssueDetected";
}

export interface EntityLinkedPayload {
  linkId: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  confidence: string;
}

export class EntityLinked extends BaseDomainEvent<EntityLinkedPayload> {
  readonly name = "EntityLinked";
}

export interface BusinessInsightGeneratedPayload {
  insight: BusinessInsightRecord;
}

export class BusinessInsightGenerated extends BaseDomainEvent<BusinessInsightGeneratedPayload> {
  readonly name = "BusinessInsightGenerated";
}

export interface RecommendationGeneratedPayload {
  recommendation: RecommendationRecord;
}

export class RecommendationGenerated extends BaseDomainEvent<RecommendationGeneratedPayload> {
  readonly name = "RecommendationGenerated";
}

export interface RecommendationAcceptedPayload {
  recommendation: RecommendationRecord;
  actionPlan: ActionPlanRecord;
}

export class RecommendationAccepted extends BaseDomainEvent<RecommendationAcceptedPayload> {
  readonly name = "RecommendationAccepted";
}

export interface RecommendationDismissedPayload {
  recommendationId: string;
}

export class RecommendationDismissed extends BaseDomainEvent<RecommendationDismissedPayload> {
  readonly name = "RecommendationDismissed";
}

export interface ActionPlanApprovedPayload {
  actionPlan: ActionPlanRecord;
  decision: DecisionRecord;
}

export class ActionPlanApproved extends BaseDomainEvent<ActionPlanApprovedPayload> {
  readonly name = "ActionPlanApproved";
}

export interface ActionPlanExecutedPayload {
  actionPlan: ActionPlanRecord;
  outcome: OutcomeRecord;
}

export class ActionPlanExecuted extends BaseDomainEvent<ActionPlanExecutedPayload> {
  readonly name = "ActionPlanExecuted";
}

export interface OutcomeMeasuredPayload {
  outcome: OutcomeRecord;
}

export class OutcomeMeasured extends BaseDomainEvent<OutcomeMeasuredPayload> {
  readonly name = "OutcomeMeasured";
}

export interface GoalPacingChangedPayload {
  goal: GoalRecord;
}

export class GoalPacingChanged extends BaseDomainEvent<GoalPacingChangedPayload> {
  readonly name = "GoalPacingChanged";
}

export interface PredictionGeneratedPayload {
  prediction: PredictionRecord;
}

export class PredictionGenerated extends BaseDomainEvent<PredictionGeneratedPayload> {
  readonly name = "PredictionGenerated";
}

export interface HypothesisProposedPayload {
  hypothesis: HypothesisRecord;
}

export class HypothesisProposed extends BaseDomainEvent<HypothesisProposedPayload> {
  readonly name = "HypothesisProposed";
}

export interface BusinessLearningUpdatedPayload {
  learning: BusinessLearningRecord;
}

export class BusinessLearningUpdated extends BaseDomainEvent<BusinessLearningUpdatedPayload> {
  readonly name = "BusinessLearningUpdated";
}

export interface CompetitorInsightGeneratedPayload {
  insight: CompetitorInsightRecord;
}

export class CompetitorInsightGenerated extends BaseDomainEvent<CompetitorInsightGeneratedPayload> {
  readonly name = "CompetitorInsightGenerated";
}

export interface PortfolioSnapshotGeneratedPayload {
  snapshot: PortfolioSnapshotRecord;
}

export class PortfolioSnapshotGenerated extends BaseDomainEvent<PortfolioSnapshotGeneratedPayload> {
  readonly name = "PortfolioSnapshotGenerated";
}

export interface SystemMetricRecordedPayload {
  metric: SystemMetricRecord;
}

export class SystemMetricRecorded extends BaseDomainEvent<SystemMetricRecordedPayload> {
  readonly name = "SystemMetricRecorded";
}

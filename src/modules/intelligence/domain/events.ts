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

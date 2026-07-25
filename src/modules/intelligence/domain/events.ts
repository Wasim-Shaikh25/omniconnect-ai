import { BaseDomainEvent } from "@/shared/kernel";
import type { SignalRecord, DataQualityIssueRecord } from "./types";

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

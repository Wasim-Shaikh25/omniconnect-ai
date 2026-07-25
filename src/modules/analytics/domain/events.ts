import { BaseDomainEvent } from "@/shared/kernel/domain-event";

export interface MarketingPerformanceUpdatedPayload {
  organizationId: string;
  storeId: string;
  generatedAt: Date;
}

export class MarketingPerformanceUpdated extends BaseDomainEvent<MarketingPerformanceUpdatedPayload> {
  readonly name = "MarketingPerformanceUpdated";
}

export interface CompetitorChangeDetectedPayload {
  organizationId: string;
  storeId: string;
  accountId: string;
  handle: string;
  previousPostCount: number;
  currentPostCount: number;
  detectedAt: Date;
}

export class CompetitorChangeDetected extends BaseDomainEvent<CompetitorChangeDetectedPayload> {
  readonly name = "CompetitorChangeDetected";
}

export interface CompetitorBenchmarkReadyPayload {
  organizationId: string;
  storeId: string;
  accountId: string;
  handle: string;
  generatedAt: Date;
}

export class CompetitorBenchmarkReady extends BaseDomainEvent<CompetitorBenchmarkReadyPayload> {
  readonly name = "CompetitorBenchmarkReady";
}

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

export interface AccountAnalyticsSyncedPayload {
  date: Date;
  fetchedAt: Date;
}

export class AccountAnalyticsSynced extends BaseDomainEvent<AccountAnalyticsSyncedPayload> {
  readonly name = "AccountAnalyticsSynced";
}

export interface MediaAnalyticsSyncedPayload {
  mediaPostId: string;
  externalId: string;
  fetchedAt: Date;
}

export class MediaAnalyticsSynced extends BaseDomainEvent<MediaAnalyticsSyncedPayload> {
  readonly name = "MediaAnalyticsSynced";
}

export interface TrendingHashtagDiscoveredPayload {
  query: string;
  fetchedAt: Date;
}

export class TrendingHashtagDiscovered extends BaseDomainEvent<TrendingHashtagDiscoveredPayload> {
  readonly name = "TrendingHashtagDiscovered";
}

export interface CompetitorContentSyncedPayload {
  storeId: string;
  trackedAccountId: string;
  handle: string;
  fetchedAt: Date;
}

export class CompetitorContentSynced extends BaseDomainEvent<CompetitorContentSyncedPayload> {
  readonly name = "CompetitorContentSynced";
}

export interface ReportGeneratedPayload {
  reportId: string;
  type: string;
  generatedAt: Date;
}

export class ReportGenerated extends BaseDomainEvent<ReportGeneratedPayload> {
  readonly name = "ReportGenerated";
}

export interface ContentRecommendationCreatedPayload {
  recommendationId: string;
  generatedAt: Date;
}

export class ContentRecommendationCreated extends BaseDomainEvent<ContentRecommendationCreatedPayload> {
  readonly name = "ContentRecommendationCreated";
}

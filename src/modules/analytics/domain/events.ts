import { BaseDomainEvent } from "@/shared/kernel/domain-event";

export interface MarketingPerformanceUpdatedPayload {
  organizationId: string;
  storeId: string;
  generatedAt: Date;
}

export class MarketingPerformanceUpdated extends BaseDomainEvent<MarketingPerformanceUpdatedPayload> {
  readonly name = "MarketingPerformanceUpdated";
}

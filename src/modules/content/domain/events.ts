import { BaseDomainEvent } from "@/shared/kernel";

export interface ContentIdeasGeneratedPayload {
  storeId: string;
  organizationId?: string;
  ideas: string[];
  evidence: string;
  generatedAt: string;
}

export class ContentIdeasGenerated extends BaseDomainEvent<ContentIdeasGeneratedPayload> {
  readonly name = "ContentIdeasGenerated";
}

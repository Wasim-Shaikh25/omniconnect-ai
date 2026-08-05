import { BaseDomainEvent } from "@/shared/kernel";

export interface ContentIdeasGeneratedPayload {
  projectId: string;
  userId?: string;
  ideas: string[];
  evidence: string;
  generatedAt: string;
}

export class ContentIdeasGenerated extends BaseDomainEvent<ContentIdeasGeneratedPayload> {
  readonly name = "ContentIdeasGenerated";
}

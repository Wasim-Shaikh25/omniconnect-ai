import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { logger } from "@/shared/observability";

export interface ProcessedWebhookEventRecord {
  id: string;
  provider: string;
  type: string;
  processedAt: Date;
}

export interface ProcessedEventsRepository {
  record(input: {
    id: string;
    provider: string;
    type: string;
  }): Promise<{ recorded: boolean }>;
}

export class PrismaProcessedEventsRepository implements ProcessedEventsRepository {
  async record(input: {
    id: string;
    provider: string;
    type: string;
  }): Promise<{ recorded: boolean }> {
    try {
      await prisma.processedWebhookEvent.create({ data: input });
      return { recorded: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        logger.info("webhook.duplicate", {
          provider: input.provider,
          id: input.id,
          type: input.type,
        });
        return { recorded: false };
      }
      throw error;
    }
  }
}

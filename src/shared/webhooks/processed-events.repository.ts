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
  record(
    input: { id: string; provider: string; type: string },
    tx?: Prisma.TransactionClient,
  ): Promise<{ recorded: boolean }>;
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export class PrismaProcessedEventsRepository implements ProcessedEventsRepository {
  async record(
    input: { id: string; provider: string; type: string },
    tx?: Prisma.TransactionClient,
  ): Promise<{ recorded: boolean }> {
    const client = tx ?? prisma;
    // When inside a transaction, a duplicate must abort the whole transaction so
    // the caller can treat it as an already-processed event. Swallowing P2002
    // inside a transaction would leave the transaction in an inconsistent state.
    if (tx) {
      await client.processedWebhookEvent.create({ data: input });
      return { recorded: true };
    }
    try {
      await client.processedWebhookEvent.create({ data: input });
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

  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

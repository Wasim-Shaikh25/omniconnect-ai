import { prisma } from "@/shared/database";
import type { TokenUsageRecord, TokenUsageRepository } from "../application/ports";

import type { Decimal } from "@prisma/client/runtime/library";

function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "object" && "toNumber" in value ? value.toNumber() : Number(value);
}

function toRecord(row: {
  id: string;
  userId: string;
  projectId: string | null;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: Decimal | null;
  createdAt: Date;
  user: { email: string; name: string | null } | null;
  project: { name: string } | null;
}): TokenUsageRecord {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    feature: row.feature,
    model: row.model,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    totalTokens: row.totalTokens,
    cost: decimalToNumber(row.cost),
    createdAt: row.createdAt,
    user: row.user,
    project: row.project,
  };
}

export class PrismaTokenUsageRepository implements TokenUsageRepository {
  async create(
    input: {
      userId: string;
      projectId?: string | null;
      feature: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost?: number | null;
    },
  ): Promise<TokenUsageRecord> {
    const row = await prisma.tokenUsage.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        feature: input.feature,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        cost: input.cost ?? null,
      },
      include: {
        user: { select: { email: true, name: true } },
        project: { select: { name: true } },
      },
    });

    return toRecord(row);
  }

  async listRecent(limit = 100): Promise<TokenUsageRecord[]> {
    const rows = await prisma.tokenUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { email: true, name: true } },
        project: { select: { name: true } },
      },
    });

    return rows.map(toRecord);
  }

  async summarizeByDay(options?: {
    start?: Date;
    end?: Date;
    userId?: string;
    projectId?: string;
  }): Promise<
    Array<{
      date: string;
      feature: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      requests: number;
      cost: number | null;
    }>
  > {
    // Prisma's groupBy cannot group by a computed date expression across all
    // SQL dialects, so we bucket on the application layer for the daily summary.
    const bucketed = new Map<
      string,
      {
        date: string;
        feature: string;
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        requests: number;
        cost: number;
      }
    >();

    const entries = await prisma.tokenUsage.findMany({
      where: {
        createdAt: {
          gte: options?.start,
          lte: options?.end,
        },
        userId: options?.userId,
        projectId: options?.projectId,
      },
      select: {
        createdAt: true,
        feature: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        cost: true,
      },
    });

    for (const entry of entries) {
      const date = entry.createdAt.toISOString().slice(0, 10);
      const key = `${date}:${entry.feature}:${entry.model}`;
      const existing = bucketed.get(key);
      const cost = decimalToNumber(entry.cost) ?? 0;

      if (existing) {
        existing.promptTokens += entry.promptTokens;
        existing.completionTokens += entry.completionTokens;
        existing.totalTokens += entry.totalTokens;
        existing.requests += 1;
        existing.cost += cost;
      } else {
        bucketed.set(key, {
          date,
          feature: entry.feature,
          model: entry.model,
          promptTokens: entry.promptTokens,
          completionTokens: entry.completionTokens,
          totalTokens: entry.totalTokens,
          requests: 1,
          cost,
        });
      }
    }

    return Array.from(bucketed.values()).map((row) => ({
      ...row,
      cost: row.cost === 0 ? null : Number(row.cost.toFixed(6)),
    }));
  }
}

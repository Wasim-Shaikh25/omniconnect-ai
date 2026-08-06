"use server";

import { prisma } from "@/shared/database";
import { requireSuperAdmin } from "@/modules/auth";
import { aiQueries } from "@/modules/ai/server";
import { getQueue } from "@/shared/queue";

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export interface SystemHealthSnapshot {
  users: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
  };
  errors: {
    last24h: number;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  ai: {
    requests24h: number;
    tokens24h: number;
    cost24h: number;
    requests7d: number;
    tokens7d: number;
    cost7d: number;
    requestsAllTime: number;
    tokensAllTime: number;
    costAllTime: number;
  };
}

export async function getSystemHealthAction(): Promise<SystemHealthSnapshot> {
  await requireSuperAdmin();

  const [total, suspended, banned, errors24h] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, suspendedAt: { not: null } } }),
    prisma.user.count({ where: { deletedAt: null, banned: true } }),
    prisma.systemLog.count({
      where: {
        level: { in: ["ERROR", "FATAL"] },
        createdAt: { gte: hoursAgo(24) },
      },
    }),
  ]);

  const active = total - suspended - banned;

  const queue = await getQueue("events");
  const counts = await queue.getJobCounts();

  const [usage24h, usage7d, usageAllTime] = await Promise.all([
    aiQueries.summarizeTokenUsageTotal({ start: hoursAgo(24) }),
    aiQueries.summarizeTokenUsageTotal({ start: hoursAgo(24 * 7) }),
    aiQueries.summarizeTokenUsageTotal(),
  ]);

  return {
    users: { total, active, suspended, banned },
    errors: { last24h: errors24h },
    queue: counts,
    ai: {
      requests24h: usage24h.requests,
      tokens24h: usage24h.totalTokens,
      cost24h: usage24h.cost,
      requests7d: usage7d.requests,
      tokens7d: usage7d.totalTokens,
      cost7d: usage7d.cost,
      requestsAllTime: usageAllTime.requests,
      tokensAllTime: usageAllTime.totalTokens,
      costAllTime: usageAllTime.cost,
    },
  };
}

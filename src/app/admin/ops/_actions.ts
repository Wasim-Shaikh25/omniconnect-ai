"use server";

import { prisma } from "@/shared/database";
import { requireSuperAdmin } from "@/modules/auth";
import { getQueue } from "@/shared/queue";
import { EVENTS_QUEUE } from "@/shared/events/queue-event-bus";
import { CONTENT_SCHEDULE_QUEUE } from "@/modules/content";

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface WebhookHealth {
  total15m: number;
  errors15m: number;
  errorRate: number;
}

export interface OperationsSnapshot {
  generatedAt: string;
  requests: {
    last15m: number;
    last1h: number;
    perMinute15m: number;
  };
  errors: {
    last15m: number;
    last1h: number;
    httpErrors15m: number;
  };
  latency: {
    p95ms: number | null;
    meanMs: number | null;
    count: number;
  };
  queues: Record<string, QueueCounts | null>;
  webhooks: {
    shopify: WebhookHealth;
    meta: WebhookHealth;
  };
  recentErrors: {
    id: string;
    level: string;
    service: string;
    message: string;
    createdAt: Date;
  }[];
}

async function countLogs(
  filter: {
    level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    levels?: ("DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL")[];
    servicePrefix?: string;
    since: Date;
  },
): Promise<number> {
  return prisma.systemLog.count({
    where: {
      level: filter.levels ? { in: filter.levels } : filter.level,
      service: filter.servicePrefix ? { startsWith: filter.servicePrefix } : undefined,
      createdAt: { gte: filter.since },
    },
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

async function computeLatency(window: Date): Promise<OperationsSnapshot["latency"]> {
  const logs = await prisma.systemLog.findMany({
    where: {
      service: "http.request",
      createdAt: { gte: window },
    },
    select: { metadata: true },
    take: 10000,
  });

  const durations = logs
    .map((log) => {
      const metadata = log.metadata as Record<string, unknown> | null;
      const duration = metadata?.durationMs;
      return typeof duration === "number" && Number.isFinite(duration) ? duration : null;
    })
    .filter((d): d is number => d !== null);

  if (durations.length === 0) {
    return { p95ms: null, meanMs: null, count: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  return {
    p95ms: percentile(sorted, 95),
    meanMs: Math.round(mean * 100) / 100,
    count: durations.length,
  };
}

async function queueSnapshot(name: string): Promise<QueueCounts | null> {
  try {
    const queue = await getQueue(name);
    return queue.getJobCounts();
  } catch {
    return null;
  }
}

async function webhookHealth(prefix: string): Promise<WebhookHealth> {
  const since = minutesAgo(15);
  const [total, errors] = await Promise.all([
    countLogs({ servicePrefix: prefix, since }),
    countLogs({ servicePrefix: prefix, levels: ["ERROR", "FATAL"], since }),
  ]);
  return {
    total15m: total,
    errors15m: errors,
    errorRate: total > 0 ? Math.round((errors / total) * 1000) / 10 : 0,
  };
}

export async function getOperationsSnapshotAction(): Promise<OperationsSnapshot> {
  await requireSuperAdmin();

  const since15m = minutesAgo(15);
  const since1h = minutesAgo(60);

  const [requests15m, requests1h, errors15m, errors1h, httpErrors15m] = await Promise.all([
    countLogs({ servicePrefix: "http.request", since: since15m }),
    countLogs({ servicePrefix: "http.request", since: since1h }),
    countLogs({ levels: ["ERROR", "FATAL"], since: since15m }),
    countLogs({ levels: ["ERROR", "FATAL"], since: since1h }),
    countLogs({ servicePrefix: "http.error", levels: ["ERROR", "FATAL"], since: since15m }),
  ]);

  const [latency, eventsQueue, scheduleQueue, shopifyWebhook, metaWebhook, recentErrors] =
    await Promise.all([
      computeLatency(since15m),
      queueSnapshot(EVENTS_QUEUE),
      queueSnapshot(CONTENT_SCHEDULE_QUEUE),
      webhookHealth("shopify.webhook"),
      webhookHealth("meta.webhook"),
      prisma.systemLog.findMany({
        where: {
          level: { in: ["ERROR", "FATAL"] },
          createdAt: { gte: since15m },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    requests: {
      last15m: requests15m,
      last1h: requests1h,
      perMinute15m: Math.round((requests15m / 15) * 10) / 10,
    },
    errors: {
      last15m: errors15m,
      last1h: errors1h,
      httpErrors15m: httpErrors15m,
    },
    latency,
    queues: {
      [EVENTS_QUEUE]: eventsQueue,
      [CONTENT_SCHEDULE_QUEUE]: scheduleQueue,
    },
    webhooks: {
      shopify: shopifyWebhook,
      meta: metaWebhook,
    },
    recentErrors: recentErrors.map((e) => ({
      id: e.id,
      level: e.level,
      service: e.service,
      message: e.message,
      createdAt: e.createdAt,
    })),
  };
}

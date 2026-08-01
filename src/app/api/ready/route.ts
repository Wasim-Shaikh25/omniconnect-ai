import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/shared/database";
import { env } from "@/shared/config";
import { getSharedRedis } from "@/shared/redis/client";
import { logger } from "@/shared/observability";
import { clientIp, rateLimit } from "@/shared/security/rate-limit";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

export async function GET(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = await rateLimit({
    key: `ready:${ip}`,
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!limit.allowed) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const checks: { name: string; ok: boolean }[] = [];
  const failures: { name: string; error: unknown }[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "database", ok: true });
  } catch (error) {
    checks.push({ name: "database", ok: false });
    failures.push({ name: "database", error });
  }

  if (env.REDIS_URL) {
    try {
      const redis = getSharedRedis();
      await redis.ping();
      checks.push({ name: "redis", ok: true });
    } catch (error) {
      checks.push({ name: "redis", ok: false });
      failures.push({ name: "redis", error });
    }
  } else {
    checks.push({ name: "redis", ok: true });
  }

  if (failures.length > 0) {
    logger.error(
      "readiness.failed",
      failures.reduce(
        (acc, { name, error }) => ({
          ...acc,
          [name]: error instanceof Error ? error.message : String(error),
        }),
        {},
      ),
    );
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json(
    { status: allOk ? "ready" : "not_ready", checks },
    {
      status: allOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

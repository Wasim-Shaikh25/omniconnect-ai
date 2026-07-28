import { NextResponse } from "next/server";
import { prisma } from "@/shared/database";
import { env } from "@/shared/config";
import { createStandaloneRedis } from "@/shared/redis/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: { name: string; ok: boolean; error?: string }[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "database", ok: true });
  } catch (error) {
    checks.push({
      name: "database",
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  if (env.REDIS_URL) {
    let redis: ReturnType<typeof createStandaloneRedis> | undefined;
    try {
      redis = createStandaloneRedis(env.REDIS_URL);
      await redis.ping();
      checks.push({ name: "redis", ok: true });
    } catch (error) {
      checks.push({
        name: "redis",
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      await redis?.quit();
    }
  } else {
    checks.push({ name: "redis", ok: true, error: "REDIS_URL not configured" });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json(
    { status: allOk ? "ready" : "not_ready", checks },
    { status: allOk ? 200 : 503 },
  );
}

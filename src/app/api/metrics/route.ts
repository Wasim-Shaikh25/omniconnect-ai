import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getQueue } from "@/shared/queue";
import { EVENTS_QUEUE } from "@/shared/events/queue-event-bus";
import { env } from "@/shared/config/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (env.METRICS_TOKEN) {
    const authHeader = request.headers.get("authorization") ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const expected = env.METRICS_TOKEN;
    const valid =
      provided.length > 0 &&
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!valid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const queue = await getQueue(EVENTS_QUEUE);
  const failed = await queue.getFailedCount();
  const body = `# HELP events_failed_jobs Number of failed jobs in the durable event queue
# TYPE events_failed_jobs gauge
events_failed_jobs{queue="${EVENTS_QUEUE}"} ${failed}\n`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}

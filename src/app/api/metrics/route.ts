import { NextResponse } from "next/server";
import { getQueue } from "@/shared/queue";
import { EVENTS_QUEUE } from "@/shared/events/queue-event-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const queue = await getQueue(EVENTS_QUEUE);
  const failed = await queue.getFailedCount();
  const body = `# HELP events_failed_jobs Number of failed jobs in the durable event queue
# TYPE events_failed_jobs gauge
events_failed_jobs{queue="${EVENTS_QUEUE}"} ${failed}\n`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}

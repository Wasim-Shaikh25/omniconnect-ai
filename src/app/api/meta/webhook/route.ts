import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { logSystem, logSystemError } from "@/shared/observability";
import {
  processMetaWebhook,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  webhookGuard,
} from "@/modules/meta/server";
import { ensureSubscribers } from "@/server/subscribers";
import { clientIp } from "@/shared/security/rate-limit";
import { PrismaProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";

const processedEvents = new PrismaProcessedEventsRepository();

function hashRawBody(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export const runtime = "nodejs";

/** Meta webhook verification handshake (GET). */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const challenge = verifyWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });

  if (challenge === null) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

/** Inbound Meta events (POST). Signature is verified before any side effects. */
export async function POST(request: Request): Promise<Response> {
  ensureSubscribers();

  if (await webhookGuard.isRateLimited(request)) {
    const message = "Meta webhook rate limited";
    void logSystem("ERROR", "meta.webhook.rateLimited", message, {
      metadata: { ip: clientIp(request.headers) },
    });
    return new NextResponse("Rate limited", { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!(await verifyWebhookSignature(rawBody, signature))) {
    const message = "Invalid Meta webhook signature";
    void logSystem("ERROR", "meta.webhook.invalidSignature", message, {});
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const eventId = hashRawBody(rawBody);
  const recorded = await processedEvents.record({
    id: eventId,
    provider: "meta",
    type: "events",
  });
  if (!recorded.recorded) {
    void logSystem("INFO", "meta.webhook.duplicate", "Duplicate Meta webhook event", {
      metadata: { eventId },
    });
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    void logSystem("ERROR", "meta.webhook.parseFailed", "Failed to parse Meta webhook body", {
      metadata: { eventId },
    });
    return new NextResponse("Bad request", { status: 400 });
  }

  const result = await processMetaWebhook(payload);
  if (!result.accepted) {
    void logSystemError("meta.webhook.processingFailed", new Error("Meta webhook not accepted"), {
      metadata: { eventId },
    });
    return new NextResponse("Bad request", { status: 400 });
  }

  void logSystem("INFO", "meta.webhook.received", "Meta webhook processed", {
    metadata: { eventId },
  });

  // Meta expects a fast 200 EVENT_RECEIVED ack.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

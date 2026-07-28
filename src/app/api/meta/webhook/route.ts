import { NextResponse } from "next/server";
import { logger } from "@/shared/observability";
import {
  processMetaWebhook,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  webhookGuard,
} from "@/modules/meta/server";
import { ensureSubscribers } from "@/server/subscribers";
import { clientIp } from "@/shared/security/rate-limit";

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
    logger.warn("meta.webhook.rateLimited", { ip: clientIp(request.headers) });
    return new NextResponse("Rate limited", { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!(await verifyWebhookSignature(rawBody, signature))) {
    logger.warn("meta.webhook.invalidSignature", {});
    return new NextResponse("Invalid signature", { status: 401 });
  }

  if (await webhookGuard.isDuplicate(rawBody)) {
    logger.info("meta.webhook.duplicate", {});
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const result = await processMetaWebhook(payload);
  if (!result.accepted) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Meta expects a fast 200 EVENT_RECEIVED ack.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

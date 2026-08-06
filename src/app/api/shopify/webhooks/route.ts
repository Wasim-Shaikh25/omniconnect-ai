import { NextResponse } from "next/server";
import { env } from "@/shared/config";
import { logger, logSystem, logSystemError } from "@/shared/observability";
import { verifyShopifyWebhookSignature } from "@/shared/security/shopify-webhook";
import { applyShopifyWebhook } from "@/modules/ecommerce";
import { ensureSubscribers } from "@/server/subscribers";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  ensureSubscribers();

  const rawBody = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "";

  const secret = env.SHOPIFY_API_SECRET;
  if (!secret) {
    logger.error("shopify.webhook.noSecret", { topic, shopDomain });
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  if (!verifyShopifyWebhookSignature(rawBody, signature, secret)) {
    const message = "Invalid Shopify webhook signature";
    void logSystem("ERROR", "shopify.webhook.invalidSignature", message, {
      metadata: { topic, shopDomain },
    });
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    void logSystem("ERROR", "shopify.webhook.parseFailed", "Failed to parse Shopify webhook body", {
      metadata: { topic, shopDomain },
    });
    return new NextResponse("Bad request", { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    void logSystem("ERROR", "shopify.webhook.invalidPayload", "Shopify webhook payload is not an object", {
      metadata: { topic, shopDomain },
    });
    return new NextResponse("Bad request", { status: 400 });
  }

  const eventId = request.headers.get("x-shopify-webhook-id") ?? `${shopDomain}:${topic}:${Date.now()}`;
  const result = await applyShopifyWebhook({
    topic,
    shopDomain,
    eventId,
    payload: payload as Record<string, unknown>,
  });

  if (!result.ok) {
    void logSystemError("shopify.webhook.processingFailed", new Error(result.message ?? "Processing failed"), {
      metadata: { topic, shopDomain, eventId },
    });
    return new NextResponse(result.message ?? "Processing failed", { status: 400 });
  }

  void logSystem("INFO", "shopify.webhook.received", "Shopify webhook processed", {
    metadata: { topic, shopDomain, eventId },
  });

  if (result.data) {
    return NextResponse.json(result.data, { status: 200 });
  }

  return new NextResponse("OK", { status: 200 });
}

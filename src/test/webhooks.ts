import { createHmac } from "node:crypto";
import Stripe from "stripe";

export function signShopifyPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

export function signMetaPayload(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${hex}`;
}

export function signStripePayload(
  body: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp,
  });
}

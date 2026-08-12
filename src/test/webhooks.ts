import { createHmac } from "node:crypto";

export function signShopifyPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

export function signMetaPayload(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${hex}`;
}

export function signRazorpayPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

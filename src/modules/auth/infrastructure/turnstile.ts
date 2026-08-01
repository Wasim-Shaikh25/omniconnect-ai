import { env } from "@/shared/config";
import { logger } from "@/shared/observability";

interface TurnstileSiteVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Disabled in dev/test when the secret is not configured.
    return true;
  }
  if (!token) return false;

  const body: Record<string, string> = {
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  };
  if (remoteIp) body.remoteip = remoteIp;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const result = (await response.json()) as TurnstileSiteVerifyResponse;
  if (!result.success) {
    logger.warn("turnstile.verifyFailed", {
      errorCodes: result["error-codes"] ?? [],
    });
    return false;
  }
  return true;
}

import { clientIp, rateLimit, type RateLimitStore } from "@/shared/security/rate-limit";

const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 15 * 60 * 1000;
const PER_ACCOUNT_LIMIT = 20;
const PER_ACCOUNT_WINDOW_MS = 60 * 60 * 1000;

export interface LoginRateLimits {
  perIpLimit?: number;
  perIpWindowMs?: number;
  perAccountLimit?: number;
  perAccountWindowMs?: number;
}

export class RateLimitError extends Error {
  readonly code = "rateLimit";
  constructor(public readonly retryAfterMs: number) {
    super("Too many login attempts.");
  }
}

export async function assertLoginRateLimit(
  email: string,
  ip: string,
  store: RateLimitStore | undefined,
  limits: LoginRateLimits = {},
): Promise<void> {
  const perIpLimit = limits.perIpLimit ?? PER_IP_LIMIT;
  const perIpWindowMs = limits.perIpWindowMs ?? PER_IP_WINDOW_MS;
  const perAccountLimit = limits.perAccountLimit ?? PER_ACCOUNT_LIMIT;
  const perAccountWindowMs = limits.perAccountWindowMs ?? PER_ACCOUNT_WINDOW_MS;

  const [perIp, perAccount] = await Promise.all([
    rateLimit({ key: `credentials:${email}:${ip}`, limit: perIpLimit, windowMs: perIpWindowMs, store }),
    rateLimit({ key: `credentials:${email}`, limit: perAccountLimit, windowMs: perAccountWindowMs, store }),
  ]);

  if (!perIp.allowed || !perAccount.allowed) {
    const retryAfterMs = Math.max(0, Math.max(perIp.resetAt, perAccount.resetAt) - Date.now());
    throw new RateLimitError(retryAfterMs);
  }
}

export async function assertLoginRateLimitFromRequest(
  request: Request | undefined,
  email: string,
): Promise<void> {
  const ip = request ? clientIp(request.headers) : "unknown";
  return assertLoginRateLimit(email, ip, undefined, {});
}

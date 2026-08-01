import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const queryMock = vi.fn();
const pingMock = vi.fn();

const redisMock = { ping: pingMock };

vi.mock("@/shared/database", () => ({
  prisma: {
    $queryRaw: queryMock,
  },
}));

vi.mock("@/shared/redis/client", () => ({
  getSharedRedis: vi.fn(() => redisMock),
}));

vi.mock("@/shared/config", () => ({
  env: {
    REDIS_URL: "redis://localhost:6379",
  },
}));

vi.mock("@/shared/security/rate-limit", () => ({
  clientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 })),
}));

function request(): NextRequest {
  return new NextRequest("http://localhost:3000/api/ready");
}

describe("GET /api/ready", () => {
  beforeEach(() => {
    queryMock.mockReset();
    pingMock.mockReset();
  });

  it("returns 200 when database and redis are up", async () => {
    queryMock.mockResolvedValue([{ "?column?": 1 }]);
    pingMock.mockResolvedValue("PONG");

    const { GET } = await import("./route");
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ready");
    expect(body.checks.every((c: { name: string; ok: boolean }) => c.ok)).toBe(true);
    expect(body.checks.some((c: { name: string }) => "error" in c)).toBe(false);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 when the database is down (T5) and omits error details (M1)", async () => {
    queryMock.mockRejectedValue(new Error("Connection refused"));
    pingMock.mockResolvedValue("PONG");

    const { GET } = await import("./route");
    const response = await GET(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("not_ready");
    expect(body.checks.some((c: { name: string; ok: boolean }) => c.name === "database" && !c.ok)).toBe(true);
    expect(body.checks.some((c: { name: string }) => "error" in c)).toBe(false);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

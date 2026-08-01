import { describe, it, expect, beforeEach, vi } from "vitest";

const queryMock = vi.fn();
const pingMock = vi.fn();
const quitMock = vi.fn();
const redisMock = { ping: pingMock, quit: quitMock };

vi.mock("@/shared/database", () => ({
  prisma: {
    $queryRaw: queryMock,
  },
}));

vi.mock("@/shared/redis/client", () => ({
  createStandaloneRedis: vi.fn(() => redisMock),
}));

vi.mock("@/shared/config", () => ({
  env: {
    REDIS_URL: "redis://localhost:6379",
  },
}));

describe("GET /api/ready", () => {
  beforeEach(() => {
    queryMock.mockReset();
    pingMock.mockReset();
    quitMock.mockReset();
  });

  it("returns 200 when database and redis are up", async () => {
    queryMock.mockResolvedValue([{ "?column?": 1 }]);
    pingMock.mockResolvedValue("PONG");

    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns 503 when the database is down (T5)", async () => {
    queryMock.mockRejectedValue(new Error("Connection refused"));
    pingMock.mockResolvedValue("PONG");

    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.checks.some((c: { name: string; ok: boolean }) => c.name === "database" && !c.ok)).toBe(true);
  });
});

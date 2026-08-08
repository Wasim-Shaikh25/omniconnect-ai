import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/shared/queue", () => ({
  getQueue: vi.fn().mockResolvedValue({ getFailedCount: vi.fn().mockResolvedValue(0) }),
}));

function requestWithAuth(authorization?: string) {
  return new Request("http://localhost:3000/api/metrics", {
    method: "GET",
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/metrics", () => {
  const originalToken = process.env.METRICS_TOKEN;

  afterEach(() => {
    process.env.METRICS_TOKEN = originalToken;
    vi.resetModules();
  });

  it("returns 401 without a Bearer token when METRICS_TOKEN is configured", async () => {
    process.env.METRICS_TOKEN = "test-token";
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(requestWithAuth());
    expect(response.status).toBe(401);
  }, 15_000);

  it("returns 401 with an incorrect Bearer token", async () => {
    process.env.METRICS_TOKEN = "test-token";
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(requestWithAuth("Bearer wrong-token"));
    expect(response.status).toBe(401);
  }, 15_000);

  it("returns 200 with the correct Bearer token", async () => {
    process.env.METRICS_TOKEN = "test-token";
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(requestWithAuth("Bearer test-token"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
  }, 15_000);
});

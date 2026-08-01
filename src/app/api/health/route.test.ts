import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 ok (T4)", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", service: "omniconnect-ai" });
    expect(typeof body.version).toBe("string");
  });
});

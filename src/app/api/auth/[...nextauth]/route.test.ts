import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import type { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  handlers: {
    GET: vi.fn(async () => new Response(JSON.stringify({ user: { name: "Test" } }), { status: 200 })),
    POST: vi.fn(async () => new Response(null, { status: 200 })),
  },
}));

describe("GET /api/auth/[...nextauth]", () => {
  it("proxies to the auth handlers and returns 200 (T4)", async () => {
    const request = new Request("http://localhost:3000/api/auth/session") as unknown as NextRequest;
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});

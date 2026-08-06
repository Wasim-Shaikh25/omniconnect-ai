import { describe, it, expect, vi, type Mock } from "vitest";
import { GET } from "./route";
import { getCurrentUser } from "@/modules/auth";
import { dataExportService, userRepository } from "@/modules/users";

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/modules/users", () => ({
  dataExportService: { getExport: vi.fn() },
  userRepository: { getExportRequest: vi.fn() },
}));

const mockGetCurrentUser = getCurrentUser as unknown as Mock<() => Promise<unknown>>;
const mockGetExport = dataExportService.getExport as unknown as Mock;
const mockGetExportRequest = userRepository.getExportRequest as unknown as Mock;

function requestFor(id: string) {
  return new Request(`http://localhost:3000/api/export/${id}`, { method: "GET" });
}

function makeSessionUser(user: { id: string; email: string }) {
  return {
    id: user.id,
    email: user.email,
    name: null,
    role: "USER",
    isSuperAdmin: false,
    userId: null,
    projectId: null,
  };
}

describe("GET /api/export/[id]", () => {
  it("returns 401 when getCurrentUser returns null (T9/T10 route-level)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await GET(requestFor("some-id"), { params: Promise.resolve({ id: "some-id" }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 for another user's export id", async () => {
    const owner = { id: "owner-1", email: "owner@example.com" };
    mockGetCurrentUser.mockResolvedValue(makeSessionUser(owner));
    mockGetExportRequest.mockResolvedValue(null);

    const response = await GET(requestFor("export-1"), { params: Promise.resolve({ id: "export-1" }) });
    expect(response.status).toBe(404);
    expect(mockGetExportRequest).toHaveBeenCalledWith("export-1", owner.id);
  });

  it("returns 401 when the session tokenVersion is stale", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetExportRequest.mockResolvedValue(null);

    const response = await GET(requestFor("export-stale"), { params: Promise.resolve({ id: "export-stale" }) });
    expect(response.status).toBe(401);
  });

  it("returns 401 when the user is soft-deleted", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetExportRequest.mockResolvedValue(null);

    const response = await GET(requestFor("export-deleted"), { params: Promise.resolve({ id: "export-deleted" }) });
    expect(response.status).toBe(401);
  });

  it("returns 200 with Cache-Control: no-store, private for a valid completed export", async () => {
    const user = { id: "user-1", email: "user@example.com" };
    const exportRequest = {
      id: "export-2",
      userId: user.id,
      status: "COMPLETED",
      downloadUrl: "/api/export/export-2",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    mockGetCurrentUser.mockResolvedValue(makeSessionUser(user));
    mockGetExportRequest.mockResolvedValue(exportRequest);
    mockGetExport.mockResolvedValue({
      userId: user.id,
      exportedAt: new Date().toISOString(),
    });

    const response = await GET(requestFor(exportRequest.id), { params: Promise.resolve({ id: exportRequest.id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(response.headers.get("Content-Disposition")).toContain(`attachment; filename="export-${exportRequest.id}.json"`);

    const body = await response.json();
    expect(body.userId).toBe(user.id);
  });
});

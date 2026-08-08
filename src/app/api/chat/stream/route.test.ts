import { describe, it, expect, vi, type Mock } from "vitest";
import { POST } from "./route";
import { getCurrentUser, requireVerifiedEmail } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { aiConfigurationRepository, chatAssistant } from "@/modules/ai/server";
import { aiUsageGuard } from "@/modules/ai";
import { rateLimit } from "@/shared/security/rate-limit";

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
  requireVerifiedEmail: vi.fn(),
}));

vi.mock("@/modules/workspaces", () => ({
  organizationQueries: { getOrganizationOverview: vi.fn() },
}));

vi.mock("@/modules/ai/server", () => ({
  aiConfigurationRepository: { getOrCreateDefault: vi.fn() },
  chatAssistant: { streamMessage: vi.fn(), saveAssistantMessage: vi.fn() },
}));

vi.mock("@/modules/ai", () => ({
  aiUsageGuard: { assertAvailable: vi.fn() },
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn(),
  clientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const mockGetCurrentUser = getCurrentUser as unknown as Mock;
const mockRequireVerifiedEmail = requireVerifiedEmail as unknown as Mock;
const mockGetOrgOverview = organizationQueries.getOrganizationOverview as unknown as Mock;
const mockRateLimit = rateLimit as unknown as Mock;
const mockAssertAvailable = aiUsageGuard.assertAvailable as unknown as Mock;

function requestFor(body: unknown) {
  return new Request("http://localhost:3000/api/chat/stream", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/stream", () => {
  const user = { userId: "user-1", name: "Test User" };
  const body = { sessionId: "s1", projectId: "p1", content: "hello" };

  it("returns 429 when the per-request rate limit is exceeded", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockRequireVerifiedEmail.mockResolvedValue(undefined);
    mockGetOrgOverview.mockResolvedValue({ stores: [{ id: "p1" }] });
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() });

    const response = await POST(requestFor(body));
    expect(response.status).toBe(429);
    expect(mockAssertAvailable).not.toHaveBeenCalled();
  });

  it("proceeds to the AI quota guard when within the rate limit", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockRequireVerifiedEmail.mockResolvedValue(undefined);
    mockGetOrgOverview.mockResolvedValue({ stores: [{ id: "p1" }] });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() });
    mockAssertAvailable.mockResolvedValue(undefined);
    (aiConfigurationRepository.getOrCreateDefault as unknown as Mock).mockResolvedValue({});
    (chatAssistant.streamMessage as unknown as Mock).mockReturnValue(
      (async function* () {
        yield "hi";
      })(),
    );

    const response = await POST(requestFor(body));
    expect(response.status).toBe(200);
    expect(mockAssertAvailable).toHaveBeenCalledWith(user.userId);
  });
});

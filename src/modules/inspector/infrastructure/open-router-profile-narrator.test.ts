import { describe, it, expect, vi } from "vitest";
import { makeOpenRouterProfileNarrator } from "./open-router-profile-narrator";
import type { AIProvider } from "@/modules/ai";
import type { ProfileInspectionResult } from "@/modules/inspector";

const sampleResult: Omit<ProfileInspectionResult, "narration"> = {
  username: "testuser",
  followerCount: 10000,
  engagementRate: 0.05,
  audienceQuality: { score: 0.75, label: "high", confidence: 0.8 },
  demographics: {
    confidence: "medium",
    topCountries: [{ country: "India", percentage: 50 }],
    topCities: [{ city: "Mumbai", percentage: 30 }],
    ageRanges: [{ range: "18-34", percentage: 45 }],
    genderSplit: { male: 45, female: 45, other: 10 },
  },
  topContent: [{ type: "reel", engagement: 100, url: "https://instagram.com/p/m1" }],
  growthTrend: "growing",
};

describe("makeOpenRouterProfileNarrator", () => {
  it("calls the AI provider with a prompt containing deterministic data", async () => {
    const aiProvider: AIProvider = {
      complete: vi.fn().mockResolvedValue("This profile is growing well."),
    };

    const narrator = makeOpenRouterProfileNarrator({ aiProvider, model: "gpt-4o-mini" });
    const narration = await narrator.narrate(sampleResult);

    expect(narration).toBe("This profile is growing well.");
    expect(aiProvider.complete).toHaveBeenCalled();
    const messages = (aiProvider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("testuser");
    expect(userMessage.content).toContain("10000");
    expect(userMessage.content).toContain("growing");
  });
});

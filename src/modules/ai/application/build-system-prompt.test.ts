import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./build-system-prompt";
import { defaultAIConfigurationRecord } from "./ai-config";

describe("buildSystemPrompt", () => {
  it("interpolates project context variables into the personality prompt", () => {
    const config = defaultAIConfigurationRecord("p1", {
      aiName: "Ava",
      systemPrompt: "Hi, I am {{ai_name}} for {{brand_name}}. We sell {{top_products}}.",
    });
    const context = {
      brandName: "Acme",
      productCount: 5,
      topProducts: [{ title: "Widget" }, { title: "Gadget" }],
      storeUrl: "https://acme.example.com",
    };
    const prompt = buildSystemPrompt(config, context);
    expect(prompt).toContain("Hi, I am Ava for Acme.");
    expect(prompt).toContain("Widget, Gadget");
  });

  it("includes sales rules when coupon creation is enabled", () => {
    const config = defaultAIConfigurationRecord("p1", {
      enabledSkills: {
        createCoupon: true,
        sendMessage: true,
        generateDashboard: true,
        accessOrderData: true,
        triggerCampaigns: false,
      },
      salesRules: { maxDiscountPct: 25, maxUses: 50, dailyBudget: 500, autoSend: true },
    });
    const prompt = buildSystemPrompt(config, { brandName: "Acme" });
    expect(prompt).toContain("max 25% discount");
    expect(prompt).toContain("Auto-send enabled");
  });

  it("states disabled skills and channels", () => {
    const config = defaultAIConfigurationRecord("p1", {
      enabledSkills: {
        createCoupon: false,
        sendMessage: true,
        generateDashboard: false,
        accessOrderData: true,
        triggerCampaigns: false,
      },
      channelSettings: {
        instagram: { enabled: true, tone: "playful", businessHoursStart: null, businessHoursEnd: null },
        facebook: { enabled: false, tone: "formal", businessHoursStart: null, businessHoursEnd: null },
        whatsapp: { enabled: true, tone: "friendly", businessHoursStart: "09:00", businessHoursEnd: "17:00" },
      },
    });
    const prompt = buildSystemPrompt(config, { brandName: "Acme" });
    expect(prompt).toContain("You cannot create coupons");
    expect(prompt).toContain("Dashboard generation is disabled");
    expect(prompt).toContain("whatsapp: tone=\"friendly\"");
    expect(prompt).not.toContain("facebook:");
  });

  it("includes escalation and knowledge base instructions", () => {
    const config = defaultAIConfigurationRecord("p1", {
      escalationRules: {
        onComplaint: true,
        onRefundRequest: true,
        onLowConfidence: false,
        notifyEmail: "owner@example.com",
        notifyPush: false,
      },
      knowledgeBase: "Free shipping over $50.",
    });
    const prompt = buildSystemPrompt(config, { brandName: "Acme" });
    expect(prompt).toContain("on complaint, on refund request");
    expect(prompt).toContain("owner@example.com");
    expect(prompt).toContain("Free shipping over $50.");
  });
});

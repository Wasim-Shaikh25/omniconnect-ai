import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReportView } from "./report-view";
import type { MarketingPerformanceView } from "@/modules/analytics";

function makeReport(): MarketingPerformanceView {
  return {
    userId: "u1",
    projectId: "p1",
    generatedAt: new Date("2026-01-01"),
    dataQuality: "live",
    summary: "Things are good",
    explanation: "This is why",
    content: {
      totalPosts: 10,
      published: 8,
      draft: 2,
      failed: 0,
      byType: { POST: 6, REEL: 4 },
      why: "Content is consistent",
      nextRecommendation: "Post more reels",
      topPosts: [
        {
          id: "mp-1",
          caption: "Top post",
          mediaType: "REEL",
          likes: 100,
          comments: 10,
          shares: 5,
          plays: 200,
          reach: 1000,
          impressions: 1500,
          saved: 3,
          engagement: 123,
          orders: 2,
          revenue: 50,
        },
      ],
    },
    audience: {
      followers: 5000,
      newFollowersThisWeek: 120,
      customers: 800,
      conversations: 40,
      messages: 90,
      why: "Audience is growing",
      nextRecommendation: "Run a giveaway",
      segments: [{ label: "engaged", count: 500 }],
      pageInsights: null,
      demographics: null,
    },
    product: {
      totalProducts: 5,
      orders: 12,
      revenue: 1234.56,
      currency: "USD",
      aov: 102.88,
      newCustomersFromMeta: 3,
      topProductByRevenue: { title: "Widget", revenue: 600 },
      why: "Product sales strong",
      nextRecommendation: "Bundle products",
      topProducts: [{ title: "Widget", revenue: 600 }],
    },
    campaign: {
      activeCampaigns: 2,
      couponsGenerated: 50,
      couponsUsed: 5,
      couponConversionRate: 0.1,
      couponRevenue: 250,
      why: "Coupons working",
      nextRecommendation: "Send reminders",
      topCampaigns: [{ name: "Spring", couponsGenerated: 50, couponsUsed: 5, revenue: 250 }],
    },
  };
}

describe("ReportView", () => {
  it("renders a full marketing report with all sections", () => {
    const html = renderToString(<ReportView content={makeReport() as unknown as Record<string, unknown>} />);
    expect(html).toContain("live");
    expect(html).toContain("Things are good");
    expect(html).toContain("Content");
    expect(html).toContain("Audience");
    expect(html).toContain("Product");
    expect(html).toContain("Campaigns");
    expect(html).toContain("Explanation");
    expect(html).toContain("$1,234.56");
    expect(html).toContain("Widget");
    expect(html).toMatch(/10[\s\S]{0,20}posts/);
    expect(html).toContain("Top post");
  });

  it("renders partial data when some sections are missing", () => {
    const html = renderToString(
      <ReportView
        content={{
          summary: "Partial report",
          dataQuality: "partial",
          content: { totalPosts: 3, why: "Only content" },
        }}
      />,
    );
    expect(html).toContain("partial");
    expect(html).toContain("Partial report");
    expect(html).toMatch(/3[\s\S]{0,20}posts/);
    expect(html).not.toContain("Audience");
  });

  it("falls back to JsonViewer for non-object content", () => {
    const html = renderToString(<ReportView content={"raw string" as unknown as Record<string, unknown>} />);
    expect(html).toContain("raw string");
  });
});

import type { EventBus } from "@/shared/events";
import { DailyMarketingBriefGenerated } from "../domain/events";
import type { DailyBriefRecord, MarketingMemoryRecord } from "../domain/types";

interface DailyBriefDeps {
  updateMarketingMemory: (
    organizationId: string,
    storeId: string,
  ) => Promise<MarketingMemoryRecord>;
  eventBus: EventBus;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

function bestPostingTime(memory: MarketingMemoryRecord): string {
  const top = memory.winningPostingTimes[0];
  if (!top) return "Today at 6:00 PM";
  return `${top.dayOfWeek}, ${formatHour(top.hour)} UTC`;
}

function buildSections(
  memory: MarketingMemoryRecord,
): DailyBriefRecord["sections"] {
  const topProduct = memory.productScores[0] ?? null;
  const topDm = memory.dmPatterns[0] ?? null;

  const sections: DailyBriefRecord["sections"] = [
    {
      title: "Follower growth",
      value: memory.followerCount,
      detail: "Recent Meta followers tracked in this store.",
    },
    {
      title: "Content opportunity",
      value: topDm?.category ?? "None",
      detail: topDm
        ? `Customers are asking about ${topDm.category.replace(/_/g, " ").toLowerCase()} (${topDm.frequency} times).`
        : "No strong DM pattern detected.",
      cta: { label: "Generate content", href: `/stores/${memory.storeId}/content` },
    },
    {
      title: "Competitor alert",
      value: memory.competitorChanges.length,
      detail:
        memory.competitorChanges.length > 0
          ? `${memory.competitorChanges.length} competitor change(s) detected.`
          : "No new competitor changes.",
    },
    {
      title: "Products to promote",
      value: topProduct?.productTitle ?? "—",
      detail: topProduct
        ? `Composite score ${Math.round(topProduct.compositeScore * 100)}. ${topProduct.evidence}`
        : "No products scored yet.",
      cta: { label: "View products", href: `/stores/${memory.storeId}/commerce/catalog` },
    },
    {
      title: "DM insights",
      value: memory.dmPatterns.reduce((sum, p) => sum + p.frequency, 0),
      detail: topDm
        ? `Top pattern: ${topDm.category.replace(/_/g, " ")}`
        : "No DM patterns yet.",
      cta: { label: "Open inbox", href: `/stores/${memory.storeId}/conversations` },
    },
    {
      title: "Comment insights",
      value: memory.commentPatterns.reduce((sum, p) => sum + p.frequency, 0),
      detail: memory.commentPatterns[0]
        ? `Top comment theme: ${memory.commentPatterns[0].category.replace(/_/g, " ").toLowerCase()} (${memory.commentPatterns[0].frequency})`
        : "No comment patterns yet.",
      cta: { label: "View comments", href: `/stores/${memory.storeId}/commerce/comments` },
    },
    {
      title: "Campaign performance",
      value: memory.campaignHistory.length,
      detail: `${memory.campaignHistory.length} coupon/automation tracked.`,
      cta: { label: "Campaigns", href: `/stores/${memory.storeId}/campaigns` },
    },
    {
      title: "Best time to post",
      value: bestPostingTime(memory),
    },
  ];

  return sections;
}

export function makeGenerateDailyBrief(deps: DailyBriefDeps) {
  return async function generateDailyBrief(
    organizationId: string,
    storeId: string,
    seedMemory?: MarketingMemoryRecord,
  ): Promise<DailyBriefRecord> {
    const memory =
      seedMemory ?? (await deps.updateMarketingMemory(organizationId, storeId));

    const topProduct = memory.productScores[0] ?? null;
    const topDm = memory.dmPatterns[0] ?? null;

    const contentIdea = topProduct
      ? `Create a Reel showcasing ${topProduct.productTitle}. ${topProduct.evidence}`
      : null;

    const trendingHashtags = memory.trendingHashtags.map((h) => h.tag).slice(0, 5);

    const priorities: string[] = [];
    if (topProduct) priorities.push(`Promote ${topProduct.productTitle}`);
    if (topDm) priorities.push(`Answer ${topDm.category.replace(/_/g, " ").toLowerCase()} in content`);
    if (memory.competitorChanges.length > 0) priorities.push("Review competitor changes");

    const brief: DailyBriefRecord = {
      organizationId,
      storeId,
      generatedAt: new Date(),
      sections: buildSections(memory),
      contentIdea,
      recommendedProductId: topProduct?.productId ?? null,
      recommendedProductTitle: topProduct?.productTitle ?? null,
      bestPostingTime: bestPostingTime(memory),
      trendingAudio: null,
      trendingHashtags,
      expectedReach: null,
      expectedSales: null,
      priorities: priorities.length > 0 ? priorities : ["Check your Daily Marketing dashboard"],
    };

    await deps.eventBus.publish(
      new DailyMarketingBriefGenerated(storeId, {
        organizationId,
        storeId,
        generatedAt: brief.generatedAt,
      }),
    );

    return brief;
  };
}

export type GenerateDailyBrief = ReturnType<typeof makeGenerateDailyBrief>;

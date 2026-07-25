import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { SocialQueries } from "@/modules/social";
import type { MetaMediaItem } from "@/modules/meta";
import type { EventBus } from "@/shared/events";
import { MarketingPerformanceUpdated } from "../domain/events";
import type { MarketingPerformanceView } from "../domain/types";

export interface GetMarketingPerformanceInput {
  organizationId: string;
  storeId: string;
}

function oneWeekAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function formatCurrency(value: number, currency: string | null): string {
  const code = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value);
  } catch {
    return `${value} ${code}`;
  }
}

function topN<T>(items: T[], key: (item: T) => number, limit: number): T[] {
  return items
    .slice()
    .sort((a, b) => key(b) - key(a))
    .slice(0, limit);
}

function engagementScore(media: MetaMediaItem): number {
  const metrics = media.metrics ?? {};
  return (
    (metrics.likes ?? 0) +
    (metrics.comments ?? 0) * 2 +
    (metrics.shares ?? 0) * 3 +
    (metrics.plays ?? 0) * 0.1
  );
}

const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function attributeOrdersToMedia(
  media: MetaMediaItem[],
  orders: { createdAt: Date; total: number | null }[],
): Map<string, { orders: number; revenue: number }> {
  const result = new Map<string, { orders: number; revenue: number }>();
  for (const item of media) {
    result.set(item.id, { orders: 0, revenue: 0 });
  }

  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    let best: MetaMediaItem | null = null;
    let bestPublishedAt: Date | null = null;
    for (const m of media) {
      if (!m.publishedAt) continue;
      const published = new Date(m.publishedAt);
      if (published > orderDate) continue;
      const diff = orderDate.getTime() - published.getTime();
      if (diff > ATTRIBUTION_WINDOW_MS) continue;
      if (!bestPublishedAt || published > bestPublishedAt) {
        best = m;
        bestPublishedAt = published;
      }
    }
    if (best) {
      const entry = result.get(best.id);
      if (entry) {
        entry.orders += 1;
        entry.revenue += order.total ?? 0;
      }
    }
  }

  return result;
}

export function makeGetMarketingPerformance(deps: {
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  social: SocialQueries;
  eventBus: EventBus;
  getAccountMedia?: (storeId: string, limit?: number) => Promise<MetaMediaItem[]>;
}) {
  return async function getMarketingPerformance(
    input: GetMarketingPerformanceInput,
  ): Promise<MarketingPerformanceView> {
    const storeId = input.storeId;
    const since = oneWeekAgo();

    const [connection, followers, customers, conversations, comments, mentions, coupons, products] =
      await Promise.all([
        deps.ecommerce.getStoreConnection(storeId),
        deps.crm.listFollowers(storeId, 500),
        deps.crm.listCustomers(storeId, 500),
        deps.conversations.listConversations(storeId, 100),
        deps.social.listComments(storeId, 500).catch(() => []),
        deps.social.listMentions(storeId, 500).catch(() => []),
        deps.ecommerce.listCoupons(storeId, 500).catch(() => []),
        deps.ecommerce.listProducts(storeId, 100).catch(() => []),
      ]);

    let ownMedia: MetaMediaItem[] = [];
    if (deps.getAccountMedia) {
      try {
        ownMedia = await deps.getAccountMedia(storeId, 25);
      } catch {
        ownMedia = [];
      }
    }

    const newFollowersThisWeek = followers.filter((f) => f.followedAt >= since).length;

    const conversationDetails = await Promise.all(
      conversations.slice(0, 50).map((c) => deps.conversations.getConversation(c.id)),
    );
    const messageCount = conversationDetails.reduce(
      (sum, d) => sum + (d?.messages.length ?? 0),
      0,
    );

    const byIntent: Record<string, number> = {};
    for (const c of comments) {
      byIntent[c.intent] = (byIntent[c.intent] ?? 0) + 1;
    }

    const hashtagCounts: Record<string, number> = {};
    for (const m of mentions) {
      for (const h of m.hashtags) {
        hashtagCounts[h] = (hashtagCounts[h] ?? 0) + 1;
      }
    }
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    let orders: Awaited<ReturnType<typeof deps.ecommerce.listOrders>> = [];
    let currency: string | null = null;
    if (connection.connected) {
      try {
        orders = await deps.ecommerce.listOrders(storeId, 500);
        currency = orders[0]?.currency ?? null;
      } catch {
        orders = [];
      }
    }
    const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    const activeCoupons = coupons.filter((c) => c.status === "ACTIVE");

    const byType: Record<string, number> = {};
    for (const m of ownMedia) {
      byType[m.mediaType] = (byType[m.mediaType] ?? 0) + 1;
    }

    const attribution = attributeOrdersToMedia(ownMedia, orders);
    const postOrders = ownMedia.reduce((sum, m) => sum + (attribution.get(m.id)?.orders ?? 0), 0);
    const postRevenue = ownMedia.reduce((sum, m) => sum + (attribution.get(m.id)?.revenue ?? 0), 0);

    const topContentPosts = topN(ownMedia, (m) => attribution.get(m.id)?.revenue ?? engagementScore(m), 5).map((m) => {
      const metrics = m.metrics ?? {};
      const attr = attribution.get(m.id) ?? { orders: 0, revenue: 0 };
      return {
        id: m.id,
        caption: m.caption ?? "",
        mediaType: m.mediaType,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        shares: metrics.shares ?? 0,
        plays: metrics.plays ?? 0,
        reach: metrics.reach ?? 0,
        impressions: metrics.impressions ?? 0,
        orders: attr.orders,
        revenue: attr.revenue,
      };
    });

    const totalPosts = ownMedia.length || mentions.length;
    const contentWhy =
      totalPosts === 0
        ? "No content has been captured yet."
        : `Captured ${totalPosts} post(s); ${postOrders} order(s) and ${formatCurrency(postRevenue, currency)} attributed within a 7-day window.`;
    const contentNext =
      totalPosts === 0
        ? "Publish more Reels/posts and track them via the connected Meta account."
        : postOrders === 0
          ? "Add clear CTAs and coupon codes to posts to make attribution stronger."
          : "Double down on the posts that drove orders; reuse their hooks and timing.";

    const audienceWhy =
      newFollowersThisWeek === 0
        ? "No new followers this week."
        : `${newFollowersThisWeek} new follower(s) this week across ${customers.length} customer(s).`;
    const audienceNext =
      conversations.length > 0 && messageCount / conversations.length > 3
        ? "High back-and-forth in conversations — run a first-follower or DM campaign to convert interest."
        : "Engage commenters and DMs to turn passive followers into leads.";
    const audienceSegments = [
      { label: "Followers", count: followers.length },
      { label: "Customers", count: customers.length },
      { label: "Conversations", count: conversations.length },
      { label: "Messages", count: messageCount },
    ];

    const productTopByPrice = topN(products, (p) => p.price ?? 0, 5).map((p) => ({
      title: p.title,
      revenue: p.price ?? 0,
    }));
    const topProductByRevenue = productTopByPrice[0] ?? null;
    const productWhy =
      orders.length === 0
        ? "No recent orders. Product promotion is the fastest path to revenue."
        : `${orders.length} order(s) generated ${formatCurrency(revenue, currency)} this week.`;
    const productNext =
      orders.length === 0
        ? "Feature your highest-engagement product in the next Reel and add a shoppable link."
        : "Run a coupon campaign for your top product to increase average order value.";

    const topCampaigns = activeCoupons.slice(0, 5).map((c) => ({
      name: `Coupon ${c.code}`,
      couponsGenerated: 1,
      couponsUsed: 0,
    }));
    const campaignWhy =
      activeCoupons.length === 0
        ? "No active coupon campaigns."
        : `${activeCoupons.length} active coupon campaign(s).`;
    const campaignNext =
      activeCoupons.length === 0
        ? "Create a first-time-follower coupon and promote it in content + DMs."
        : "Track coupon usage and pair the best performer with a high-intent DM flow.";

    const explanation = `Content: ${contentWhy} ${contentNext} Audience: ${audienceWhy} ${audienceNext} Product: ${productWhy} ${productNext} Campaign: ${campaignWhy} ${campaignNext}`;

    const summary = `Followers: ${followers.length} (${newFollowersThisWeek} new this week). Conversations: ${conversations.length}. Orders: ${orders.length}, revenue ${formatCurrency(revenue, currency)}. Post-attributed orders: ${postOrders} (${formatCurrency(postRevenue, currency)}). Top hashtags: ${topHashtags.map((h) => `#${h}`).join(", ") || "none"}.`;

    const view: MarketingPerformanceView = {
      organizationId: input.organizationId,
      storeId,
      generatedAt: new Date(),
      content: {
        totalPosts,
        published: ownMedia.length,
        draft: 0,
        failed: 0,
        byType,
        why: contentWhy,
        nextRecommendation: contentNext,
        topPosts: topContentPosts,
      },
      audience: {
        followers: followers.length,
        newFollowersThisWeek,
        customers: customers.length,
        conversations: conversations.length,
        messages: messageCount,
        why: audienceWhy,
        nextRecommendation: audienceNext,
        segments: audienceSegments,
      },
      product: {
        totalProducts: connection.productCount,
        orders: orders.length,
        revenue,
        currency,
        topProductByRevenue,
        why: productWhy,
        nextRecommendation: productNext,
        topProducts: productTopByPrice,
      },
      campaign: {
        activeCampaigns: activeCoupons.length,
        couponsGenerated: coupons.length,
        couponsUsed: 0,
        why: campaignWhy,
        nextRecommendation: campaignNext,
        topCampaigns,
      },
      summary,
      explanation,
    };

    await deps.eventBus.publish(
      new MarketingPerformanceUpdated(storeId, {
        organizationId: input.organizationId,
        storeId,
        generatedAt: view.generatedAt,
      }),
    );

    return view;
  };
}

export type GetMarketingPerformance = ReturnType<typeof makeGetMarketingPerformance>;

import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { SocialQueries } from "@/modules/social";
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

export function makeGetMarketingPerformance(deps: {
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  social: SocialQueries;
  eventBus: EventBus;
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

    // Content heuristics
    const totalPosts = mentions.length;
    const topContentPosts = topN(mentions, (m) => new Date(m.createdAt).getTime(), 5).map((m) => ({
      caption: m.caption ?? "",
      mediaType: m.mediaUrl ? "IMAGE" : "OTHER",
      likes: 0,
      comments: 0,
    }));
    const topIntent = Object.entries(byIntent).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const contentWhy =
      totalPosts === 0
        ? "No content mentions have been captured yet."
        : `Captured ${totalPosts} mention(s)${topIntent ? `; top comment intent is "${topIntent.toLowerCase()}"` : ""}.`;
    const contentNext =
      totalPosts < 5
        ? "Publish more Reels/posts and track them via the connected Meta account."
        : topIntent === "PRICE_OBJECTION" || topIntent === "SIZE_QUESTION"
          ? "Create content that directly answers the top comment/DM objections."
          : "Double down on the formats that are getting mentions; test competitor trending formats.";

    // Audience heuristics
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

    // Product heuristics
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

    // Campaign heuristics
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

    const summary = `Followers: ${followers.length} (${newFollowersThisWeek} new this week). Conversations: ${conversations.length}. Orders: ${orders.length}, revenue ${formatCurrency(revenue, currency)}. Top hashtags: ${topHashtags.map((h) => `#${h}`).join(", ") || "none"}.`;

    const view: MarketingPerformanceView = {
      organizationId: input.organizationId,
      storeId,
      generatedAt: new Date(),
      content: {
        totalPosts,
        published: totalPosts,
        draft: 0,
        failed: 0,
        byType: byIntent,
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

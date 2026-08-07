import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { SocialQueries } from "@/modules/social";
import type { MetaMediaItem, MetaPageInsights, MetaAudienceInsights, AudienceDemographics } from "@/modules/meta";
import type { EventBus } from "@/shared/events";
import { MarketingPerformanceUpdated } from "../domain/events";
import type { MarketingPerformanceView } from "../domain/types";

export interface GetMarketingPerformanceInput {
  userId: string;
  projectId: string;
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
    (metrics.plays ?? 0) * 0.1 +
    (metrics.engagement ?? 0) * 1 +
    (metrics.saved ?? 0) * 2 +
    (metrics.videoViews ?? 0) * 0.1
  );
}

function mapAudienceDemographics(
  demographics: AudienceDemographics,
): { genderAge: Record<string, number>; cities: Record<string, number>; countries: Record<string, number>; locales: Record<string, number> } {
  return {
    genderAge: { ...demographics.genderAge },
    cities: { ...demographics.cities },
    countries: { ...demographics.countries },
    locales: { ...demographics.locales },
  };
}

const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function attributeOrdersToMedia(
  media: MetaMediaItem[],
  orders: { createdAt: Date; total: number | null; customerEmail?: string | null; customerRef?: string | null; couponCode?: string | null }[],
): {
  byMedia: Map<string, { orders: number; revenue: number }>;
  newCustomersFromMeta: number;
  ordersByCoupon: Map<string, { used: number; revenue: number }>;
} {
  const byMedia = new Map<string, { orders: number; revenue: number }>();
  for (const item of media) {
    byMedia.set(item.id, { orders: 0, revenue: 0 });
  }

  const ordersByCoupon = new Map<string, { used: number; revenue: number }>();
  const seenCustomers = new Set<string>();
  let newCustomersFromMeta = 0;

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
      const entry = byMedia.get(best.id);
      if (entry) {
        entry.orders += 1;
        entry.revenue += order.total ?? 0;
      }
      const customerKey = order.customerEmail || order.customerRef || "";
      if (customerKey && !seenCustomers.has(customerKey)) {
        seenCustomers.add(customerKey);
        newCustomersFromMeta += 1;
      }
    }

    if (order.couponCode) {
      const couponEntry = ordersByCoupon.get(order.couponCode) ?? { used: 0, revenue: 0 };
      couponEntry.used += 1;
      couponEntry.revenue += order.total ?? 0;
      ordersByCoupon.set(order.couponCode, couponEntry);
    }

    const customerKey = order.customerEmail || order.customerRef || "";
    if (customerKey) seenCustomers.add(customerKey);
  }

  return { byMedia, newCustomersFromMeta, ordersByCoupon };
}

export function makeGetMarketingPerformance(deps: {
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  social: SocialQueries;
  eventBus: EventBus;
  getAccountMedia?: (projectId: string, limit?: number) => Promise<MetaMediaItem[]>;
  getPageInsights?: (projectId: string, days?: number) => Promise<MetaPageInsights | null>;
  getAudienceInsights?: (projectId: string) => Promise<MetaAudienceInsights | null>;
}) {
  return async function getMarketingPerformance(
    input: GetMarketingPerformanceInput,
  ): Promise<MarketingPerformanceView> {
    const projectId = input.projectId;
    const since = oneWeekAgo();

    const [connection, followers, customers, conversations, comments, mentions, coupons, products] =
      await Promise.all([
        deps.ecommerce.getStoreConnection(projectId),
        deps.crm.listFollowers(projectId, 500),
        deps.crm.listCustomers(projectId, 500),
        deps.conversations.listConversations(projectId, 100),
        deps.social.listComments(projectId, 500).catch(() => []),
        deps.social.listMentions(projectId, 500).catch(() => []),
        deps.ecommerce.listCoupons(projectId, 500).catch(() => []),
        deps.ecommerce.listProducts(projectId, 100).catch(() => []),
      ]);

    let ownMedia: MetaMediaItem[] = [];
    let mediaSourceError = !deps.getAccountMedia;
    if (deps.getAccountMedia) {
      try {
        ownMedia = await deps.getAccountMedia(projectId, 25);
      } catch {
        ownMedia = [];
        mediaSourceError = true;
      }
    }

    let pageInsights: MetaPageInsights | null = null;
    let audienceInsights: MetaAudienceInsights | null = null;
    try {
      pageInsights = deps.getPageInsights ? await deps.getPageInsights(projectId, 7) : null;
      audienceInsights = deps.getAudienceInsights ? await deps.getAudienceInsights(projectId) : null;
    } catch {
      pageInsights = null;
      audienceInsights = null;
    }
    const hasMediaInsights = ownMedia.some(
      (m) => m.metrics?.reach != null || m.metrics?.impressions != null || m.metrics?.engagement != null,
    );

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
        orders = await deps.ecommerce.listOrders(projectId, 500);
        currency = orders[0]?.currency ?? null;
      } catch {
        orders = [];
      }
    }
    const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const aov = orders.length > 0 ? revenue / orders.length : null;

    const activeCoupons = coupons.filter((c) => c.status === "ACTIVE");

    const byType: Record<string, number> = {};
    for (const m of ownMedia) {
      byType[m.mediaType] = (byType[m.mediaType] ?? 0) + 1;
    }

    const attribution = attributeOrdersToMedia(
      ownMedia,
      orders.map((o) => ({
        createdAt: o.orderDate,
        total: o.total,
        customerEmail: o.customerEmail,
        customerRef: o.customerRef,
        couponCode: o.couponCode,
      })),
    );

    const couponsGenerated = coupons.length;
    const couponsUsed = attribution.ordersByCoupon.size > 0
      ? Array.from(attribution.ordersByCoupon.values()).reduce((sum, c) => sum + c.used, 0)
      : orders.filter((o) => o.couponCode).length;
    const couponRevenue = Array.from(attribution.ordersByCoupon.values()).reduce((sum, c) => sum + c.revenue, 0);
    const couponConversionRate = couponsGenerated > 0 ? (couponsUsed / couponsGenerated) * 100 : null;
    const postOrders = ownMedia.reduce((sum, m) => sum + (attribution.byMedia.get(m.id)?.orders ?? 0), 0);
    const postRevenue = ownMedia.reduce((sum, m) => sum + (attribution.byMedia.get(m.id)?.revenue ?? 0), 0);

    const topContentPosts = topN(ownMedia, (m) => attribution.byMedia.get(m.id)?.revenue ?? engagementScore(m), 5).map((m) => {
      const metrics = m.metrics ?? {};
      const attr = attribution.byMedia.get(m.id) ?? { orders: 0, revenue: 0 };
      return {
        id: m.id,
        caption: m.caption ?? "",
        mediaType: m.mediaType,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        shares: metrics.shares ?? 0,
        plays: metrics.plays ?? metrics.videoViews ?? 0,
        reach: metrics.reach ?? 0,
        impressions: metrics.impressions ?? 0,
        saved: metrics.saved ?? 0,
        engagement: metrics.engagement ?? 0,
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

    const topCampaigns = topN(
      Array.from(new Set([...coupons.map((c) => c.code), ...orders.filter((o) => o.couponCode).map((o) => o.couponCode as string)])),
      (code) => attribution.ordersByCoupon.get(code)?.revenue ?? 0,
      5,
    ).map((code) => ({
      name: `Coupon ${code}`,
      couponsGenerated: coupons.filter((c) => c.code === code).length || 1,
      couponsUsed: attribution.ordersByCoupon.get(code)?.used ?? 0,
      revenue: attribution.ordersByCoupon.get(code)?.revenue ?? 0,
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

    let dataQuality: "live" | "partial" | "simulated" = "simulated";
    if (hasMediaInsights) {
      dataQuality = "live";
    } else if (ownMedia.length > 0 || pageInsights != null) {
      dataQuality = "partial";
    } else if (!mediaSourceError) {
      dataQuality = "partial";
    }

    const view: MarketingPerformanceView = {
      userId: input.userId,
      projectId,
      generatedAt: new Date(),
      dataQuality,
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
        pageInsights: pageInsights
          ? {
              username: pageInsights.username,
              followers: pageInsights.followers,
              mediaCount: pageInsights.mediaCount,
              impressions: pageInsights.impressions,
              reach: pageInsights.reach,
              profileViews: pageInsights.profileViews,
              biography: pageInsights.biography,
              profilePictureUrl: pageInsights.profilePictureUrl,
            }
          : null,
        demographics: audienceInsights ? mapAudienceDemographics(audienceInsights.demographics) : null,
      },
      product: {
        totalProducts: connection.productCount,
        orders: orders.length,
        revenue,
        currency,
        aov,
        newCustomersFromMeta: attribution.newCustomersFromMeta,
        topProductByRevenue,
        why: productWhy,
        nextRecommendation: productNext,
        topProducts: productTopByPrice,
      },
      campaign: {
        activeCampaigns: activeCoupons.length,
        couponsGenerated,
        couponsUsed,
        couponConversionRate,
        couponRevenue,
        why: campaignWhy,
        nextRecommendation: campaignNext,
        topCampaigns,
      },
      summary,
      explanation,
    };

    await deps.eventBus.publish(
      new MarketingPerformanceUpdated(projectId, {
        userId: input.userId,
        projectId,
        generatedAt: view.generatedAt,
      }),
    );

    return view;
  };
}

export type GetMarketingPerformance = ReturnType<typeof makeGetMarketingPerformance>;

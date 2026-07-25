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

    const [connection, followers, customers, conversations, comments, mentions, coupons] =
      await Promise.all([
        deps.ecommerce.getStoreConnection(storeId),
        deps.crm.listFollowers(storeId, 500),
        deps.crm.listCustomers(storeId, 500),
        deps.conversations.listConversations(storeId, 100),
        deps.social.listComments(storeId, 500).catch(() => []),
        deps.social.listMentions(storeId, 500).catch(() => []),
        deps.ecommerce.listCoupons(storeId, 500).catch(() => []),
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

    const activeCoupons = coupons.filter((c) => c.status === "ACTIVE").length;

    const view: MarketingPerformanceView = {
      organizationId: input.organizationId,
      storeId,
      generatedAt: new Date(),
      content: {
        totalPosts: mentions.length,
        published: mentions.length,
        draft: 0,
        failed: 0,
        byType: byIntent,
      },
      audience: {
        followers: followers.length,
        newFollowersThisWeek,
        customers: customers.length,
        conversations: conversations.length,
        messages: messageCount,
      },
      product: {
        totalProducts: connection.productCount,
        orders: orders.length,
        revenue,
        currency,
        topProductByRevenue: null,
      },
      campaign: {
        activeCampaigns: activeCoupons,
        couponsGenerated: coupons.length,
        couponsUsed: 0,
      },
      summary: `Followers: ${followers.length} (${newFollowersThisWeek} new this week). Conversations: ${conversations.length}. Orders: ${orders.length}, revenue ${formatCurrency(revenue, currency)}. Top hashtags: ${topHashtags.map((h) => `#${h}`).join(", ") || "none"}.`,
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

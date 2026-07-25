import type { EventBus } from "@/shared/events";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { AnalyticsQueries } from "@/modules/analytics";
import type { SocialQueries } from "@/modules/social";
import { MarketingMemoryUpdated } from "../domain/events";
import type { ConversationRecord, MessageRecord } from "@/modules/conversations";
import type { TrackedAccountRecord } from "@/modules/analytics";
import type { SocialCommentRecord, SocialMentionRecord } from "@/modules/social";
import type { MetaMediaItem } from "@/modules/meta";
import type { MarketingMemoryRecord, ProductScoreRecord } from "../domain/types";

interface MarketingMemoryDeps {
  ecommerceQueries: EcommerceQueries;
  conversationQueries: ConversationQueries;
  crmQueries: CrmQueries;
  analyticsQueries: AnalyticsQueries;
  getAccountMedia: (storeId: string, limit?: number) => Promise<MetaMediaItem[]>;
  socialQueries: SocialQueries;
  eventBus: EventBus;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  PRICE_OBJECTION: ["expensive", "too much", "price", "cost", "cheaper", "discount"],
  SIZE_QUESTION: ["size", "large", "small", "medium", "xl", "xxl", "fit"],
  AVAILABILITY: ["available", "in stock", "when", "restock", "sold out"],
  COMPLIMENT: ["love", "beautiful", "amazing", "great", "perfect"],
  COMPLAINT: ["bad", "terrible", "wrong", "issue", "problem", "delay"],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function classifyMessage(content: string): string | null {
  const normalized = normalize(content);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => normalized.includes(k))) return category;
  }
  return null;
}

function mentionsProduct(content: string, productTitle: string): boolean {
  const normalizedContent = normalize(content);
  const normalizedTitle = normalize(productTitle).split(/\s+/).filter(Boolean);
  if (normalizedTitle.length === 0) return false;
  return normalizedTitle.every((word) => normalizedContent.includes(word));
}

function redactPhrase(phrase: string): string {
  // Drop usernames, emails, and phone-like tokens. Keep first 6 words.
  return phrase
    .replace(/@[\w.]+/g, "@user")
    .replace(/\S+@\S+/g, "[email]")
    .replace(/\b\d{7,}\b/g, "[number]")
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");
}

function samplePhrases(messages: string[], limit = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const text of messages) {
    const sample = redactPhrase(text);
    if (!seen.has(sample)) {
      seen.add(sample);
      result.push(sample);
      if (result.length >= limit) break;
    }
  }
  return result;
}

async function loadMessagesForConversations(
  conversationQueries: ConversationQueries,
  conversations: ConversationRecord[],
): Promise<{ conversationId: string; messages: MessageRecord[] }[]> {
  const details = await Promise.all(
    conversations.map((c) => conversationQueries.getConversation(c.id)),
  );
  return details
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => ({ conversationId: d.conversation.id, messages: d.messages }));
}

function scoreProducts(
  products: { id: string; title: string; price: number | null; inventory: number | null; currency: string | null }[],
  conversations: { conversationId: string; messages: MessageRecord[] }[],
  orders: { total: number }[],
): ProductScoreRecord[] {
  const allMessages = conversations.flatMap((c) => c.messages);
  const totalStoreMessages = Math.max(allMessages.length, 1);
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  return products.map((product) => {
    const mentionMessages = allMessages.filter(
      (m) => m.sender === "CUSTOMER" && mentionsProduct(m.content, product.title),
    );
    const mentionCount = mentionMessages.length;

    // Simple rule-based scores 0-1.
    const conversationScore = Math.min(mentionCount / 5, 1);
    const engagementScore = Math.min(mentionCount / totalStoreMessages, 1) * 2;
    const contentScore = product.title.split(/\s+/).length >= 2 ? 0.7 : 0.4;
    const salesScore = totalOrderValue > 0 ? Math.min(totalOrderValue / 1000, 1) : 0;
    const trendScore = product.inventory !== null && product.inventory < 10 ? 0.8 : 0.5;
    const competitorScore = 0.5;

    const compositeScore =
      (contentScore * 0.15 +
        engagementScore * 0.25 +
        conversationScore * 0.25 +
        salesScore * 0.15 +
        trendScore * 0.1 +
        competitorScore * 0.1);

    return {
      productId: product.id,
      productTitle: product.title,
      contentScore,
      engagementScore,
      conversationScore,
      salesScore,
      trendScore,
      competitorScore,
      compositeScore,
      evidence:
        mentionCount > 0
          ? `Mentioned in ${mentionCount} customer message(s).`
          : "No recent customer mentions.",
    };
  });
}

function extractDmPatterns(
  conversations: { conversationId: string; messages: MessageRecord[] }[],
): { category: string; frequency: number; samplePhrases: string[] }[] {
  const messages = conversations.flatMap((c) =>
    c.messages.filter((m) => m.sender === "CUSTOMER").map((m) => m.content),
  );

  const byCategory: Record<string, string[]> = {};
  for (const text of messages) {
    const category = classifyMessage(text);
    if (!category) continue;
    byCategory[category] = byCategory[category] ?? [];
    byCategory[category].push(text);
  }

  return Object.entries(byCategory)
    .map(([category, texts]) => ({
      category,
      frequency: texts.length,
      samplePhrases: samplePhrases(texts, 3),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

function extractCommentPatterns(comments: SocialCommentRecord[]) {
  const byCategory: Record<string, string[]> = {};
  for (const comment of comments) {
    const category = classifyMessage(comment.text) ?? comment.intent ?? "OTHER";
    byCategory[category] = byCategory[category] ?? [];
    byCategory[category].push(comment.text);
  }

  return Object.entries(byCategory)
    .map(([category, texts]) => ({
      category,
      frequency: texts.length,
      samplePhrases: samplePhrases(texts, 3),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

function engagementScore(item: MetaMediaItem): number {
  const metrics = item.metrics ?? {};
  return (metrics.likes ?? 0) + (metrics.comments ?? 0) * 2 + (metrics.shares ?? 0) * 3 + (metrics.plays ?? 0) * 0.1;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function computeWinningPostingTimes(
  media: MetaMediaItem[],
): { dayOfWeek: string; hour: number; engagementScore: number }[] {
  const buckets = new Map<string, { dayOfWeek: string; hour: number; total: number; count: number }>();

  for (const item of media) {
    const publishedAt = item.publishedAt;
    if (!publishedAt) continue;
    const score = engagementScore(item);
    const dayIndex = publishedAt.getUTCDay();
    const hour = publishedAt.getUTCHours();
    const key = `${dayIndex}-${hour}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.total += score;
      existing.count += 1;
    } else {
      buckets.set(key, { dayOfWeek: DAYS[dayIndex], hour, total: score, count: 1 });
    }
  }

  return Array.from(buckets.values())
    .map((b) => ({ dayOfWeek: b.dayOfWeek, hour: b.hour, engagementScore: b.total / b.count }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 5);
}

function detectCompetitorChanges(accounts: TrackedAccountRecord[]) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return accounts
    .filter(
      (a) =>
        a.lastAnalysis != null && a.lastSyncedAt != null && a.lastSyncedAt > oneWeekAgo,
    )
    .map((a) => {
      const posts = (a.lastMedia as MetaMediaItem[] | null) ?? [];
      const topPost = posts.length > 0
        ? posts.slice().sort((x, y) => engagementScore(y) - engagementScore(x))[0]
        : null;
      return {
        trackedAccountId: a.id,
        handle: a.handle,
        changeType: "Recent analysis available",
        detectedAt: a.lastSyncedAt!,
        latestCaption: redactPhrase(topPost?.caption ?? "").slice(0, 120) || null,
        latestMediaType: topPost?.mediaType ?? null,
        latestEngagement: topPost ? engagementScore(topPost) : 0,
      };
    })
    .slice(0, 5);
}

function extractTrendingHashtags(mentions: SocialMentionRecord[]) {
  const counts: Record<string, number> = {};
  for (const mention of mentions) {
    for (const tag of mention.hashtags) {
      const normalized = tag.toLowerCase().replace(/^#/, "");
      if (!normalized) continue;
      counts[normalized] = (counts[normalized] ?? 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([tag, postCount]) => ({ tag, postCount, engagement: 0 }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5);
}

export function makeUpdateMarketingMemory(deps: MarketingMemoryDeps) {
  return async function updateMarketingMemory(
    organizationId: string,
    storeId: string,
  ): Promise<MarketingMemoryRecord> {
    const [products, coupons, conversations, followers, comments, mentions, accounts] =
      await Promise.all([
        deps.ecommerceQueries.listProducts(storeId, 100),
        deps.ecommerceQueries.listCoupons(storeId, 100),
        deps.conversationQueries.listConversations(storeId, 50),
        deps.crmQueries.listFollowers(storeId, 100),
        deps.socialQueries.listComments(storeId, 100),
        deps.socialQueries.listMentions(storeId, 100),
        deps.analyticsQueries.listTrackedAccounts(storeId),
      ]);

    const ownMedia = await deps.getAccountMedia(storeId, 25).catch(() => []);

    let orders: { total: number }[] = [];
    try {
      orders = await deps.ecommerceQueries.listOrders(storeId, 100);
    } catch {
      // Connector may be unavailable; revenue scores fall back to null.
    }

    const conversationsWithMessages = await loadMessagesForConversations(
      deps.conversationQueries,
      conversations,
    );

    const productScores = scoreProducts(
      products.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        inventory: p.inventory,
        currency: p.currency,
      })),
      conversationsWithMessages,
      orders,
    );

    const dmPatterns = extractDmPatterns(conversationsWithMessages);
    const commentPatterns = extractCommentPatterns(comments);
    const trendingHashtags = extractTrendingHashtags(mentions);
    const competitorChanges = detectCompetitorChanges(accounts);
    const winningPostingTimes = computeWinningPostingTimes(ownMedia);

    const topPerformingPosts = ownMedia
      .filter((m) => Boolean(m.caption))
      .sort((a, b) => engagementScore(b) - engagementScore(a))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        title: m.caption ? redactPhrase(m.caption).slice(0, 100) : "",
        engagement: engagementScore(m),
      }));

    const record: MarketingMemoryRecord = {
      organizationId,
      storeId,
      generatedAt: new Date(),
      followerCount: followers.length,
      productScores,
      topPerformingPosts,
      dmPatterns,
      commentPatterns,
      trendingHashtags,
      winningPostingTimes,
      customerObjections: dmPatterns
        .filter((p) => p.category === "PRICE_OBJECTION" || p.category === "COMPLAINT")
        .map((p) => ({ phrase: p.category, frequency: p.frequency })),
      competitorChanges,
      campaignHistory: coupons.map((c) => ({
        campaignId: c.id,
        name: `Coupon ${c.code}`,
        outcome: `${c.status} · ${c.discountPct}%`,
      })),
    };

    await deps.eventBus.publish(
      new MarketingMemoryUpdated(storeId, { organizationId, storeId, generatedAt: record.generatedAt }),
    );

    return record;
  };
}

export type UpdateMarketingMemory = ReturnType<typeof makeUpdateMarketingMemory>;

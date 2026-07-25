import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import type {
  MetaIntegrationRepository,
  MetaMediaItem,
  MetaService,
  HashtagMediaOptions,
  CompetitorMediaOptions,
} from "../application/ports";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

/**
 * Outbound Graph API adapter. Config-gated: without a stored page token (or in
 * dev) it no-ops after logging, so the rest of the flow works without a live
 * Meta app. Tokens are read from infrastructure and never logged.
 */
export class GraphApiMetaService implements MetaService {
  constructor(private readonly integrations: MetaIntegrationRepository) {}

  async sendMessage(input: {
    storeId: string;
    recipientId: string;
    text: string;
  }): Promise<void> {
    const token = await this.integrations.findAccessToken(input.storeId);
    if (!token || !env.META_APP_ID) {
      logger.info("meta.sendMessage.skipped", {
        storeId: input.storeId,
        reason: "not-configured",
      });
      return;
    }

    const res = await fetch(`${GRAPH_API_BASE}/me/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: input.recipientId },
        message: { text: input.text },
      }),
    });

    if (!res.ok) {
      logger.warn("meta.sendMessage.failed", {
        storeId: input.storeId,
        status: res.status,
      });
      return;
    }

    logger.info("meta.sendMessage.ok", { storeId: input.storeId });
  }

  async searchHashtag(
    storeId: string,
    query: string,
  ): Promise<{ hashtagId: string | null; userId: string | null }> {
    const token = await this.integrations.findAccessToken(storeId);
    const integration = await this.integrations.findByStore(storeId);
    if (!token || !integration?.accountId) {
      logger.info("meta.searchHashtag.skipped", { storeId, query, reason: "not-configured" });
      if (env.NODE_ENV !== "production") {
        return { hashtagId: `mock-hashtag-${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, userId: "mock-user" };
      }
      return { hashtagId: null, userId: null };
    }

    try {
      const url = `${GRAPH_API_BASE}/ig_hashtag_search?user_id=${integration.accountId}&q=${encodeURIComponent(query)}&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("meta.searchHashtag.failed", { storeId, query, status: res.status });
        return { hashtagId: null, userId: integration.accountId };
      }
      const payload: unknown = await res.json();
      const data = (payload as { data?: { id: string }[] }).data;
      return { hashtagId: data?.[0]?.id ?? null, userId: integration.accountId };
    } catch (error) {
      logger.error("meta.searchHashtag.error", {
        storeId,
        query,
        error: error instanceof Error ? error.message : "unknown",
      });
      return { hashtagId: null, userId: integration.accountId };
    }
  }

  async getHashtagMedia(
    storeId: string,
    hashtagId: string,
    options: HashtagMediaOptions = { top: true, limit: 10 },
  ): Promise<MetaMediaItem[]> {
    const token = await this.integrations.findAccessToken(storeId);
    const integration = await this.integrations.findByStore(storeId);
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
    if (!token || !integration?.accountId) {
      logger.info("meta.getHashtagMedia.skipped", { storeId, hashtagId, reason: "not-configured" });
      if (env.NODE_ENV !== "production") {
        return generateSampleMedia(hashtagId.replace(/^mock-hashtag-/, ""), limit);
      }
      return [];
    }

    const kind = options.recent ? "recent_media" : "top_media";
    const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{id,media_type,media_url,permalink,caption,timestamp,thumbnail_url}";
    const url = `${GRAPH_API_BASE}/${hashtagId}/${kind}?user_id=${integration.accountId}&fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${token}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("meta.getHashtagMedia.failed", { storeId, hashtagId, status: res.status });
        return [];
      }
      const payload: unknown = await res.json();
      const rows = (payload as { data?: unknown[] }).data ?? [];
      return rows.map((row) => parseMediaItem(row, "INSTAGRAM")).filter((m): m is MetaMediaItem => m !== null);
    } catch (error) {
      logger.error("meta.getHashtagMedia.error", {
        storeId,
        hashtagId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }

  async getAccountMedia(storeId: string, limit = 10): Promise<MetaMediaItem[]> {
    const token = await this.integrations.findAccessToken(storeId);
    const integration = await this.integrations.findByStore(storeId);
    if (!token || !integration?.accountId) {
      logger.info("meta.getAccountMedia.skipped", { storeId, reason: "not-configured" });
      return [];
    }

    const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{id,media_type,media_url,permalink,caption,timestamp,thumbnail_url}";
    const url = `${GRAPH_API_BASE}/${integration.accountId}/media?fields=${encodeURIComponent(fields)}&limit=${Math.min(limit, 25)}&access_token=${token}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("meta.getAccountMedia.failed", { storeId, status: res.status });
        return [];
      }
      const payload: unknown = await res.json();
      const rows = (payload as { data?: unknown[] }).data ?? [];
      return rows.map((row) => parseMediaItem(row, "INSTAGRAM")).filter((m): m is MetaMediaItem => m !== null);
    } catch (error) {
      logger.error("meta.getAccountMedia.error", {
        storeId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }

  async getCompetitorMedia(
    storeId: string,
    handle: string,
    options: CompetitorMediaOptions = {},
  ): Promise<MetaMediaItem[]> {
    const token = await this.integrations.findAccessToken(storeId);
    const integration = await this.integrations.findByStore(storeId);
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
    if (!token || !integration?.accountId) {
      logger.info("meta.getCompetitorMedia.skipped", { storeId, handle, reason: "not-configured" });
      if (env.NODE_ENV !== "production") {
        return generateSampleCompetitorMedia(handle, limit);
      }
      return [];
    }

    const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{id,media_type,media_url,permalink,caption,timestamp,thumbnail_url}";
    const url = `${GRAPH_API_BASE}/${integration.accountId}?fields=business_discovery.username(${handle}){id,media{${fields}}}&access_token=${token}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("meta.getCompetitorMedia.failed", { storeId, handle, status: res.status });
        return [];
      }
      const payload: unknown = await res.json();
      const media = (payload as { business_discovery?: { media?: { data?: unknown[] } } })?.business_discovery?.media?.data ?? [];
      return media.map((row) => parseMediaItem(row, "INSTAGRAM")).filter((m): m is MetaMediaItem => m !== null);
    } catch (error) {
      logger.error("meta.getCompetitorMedia.error", {
        storeId,
        handle,
        error: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }
}

function parseMediaItem(raw: unknown, platform: "INSTAGRAM" | "FACEBOOK"): MetaMediaItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : "";
  const caption = typeof item.caption === "string" ? item.caption : null;
  const permalink = typeof item.permalink === "string" ? item.permalink : null;
  const mediaUrl = typeof item.media_url === "string" ? item.media_url : null;
  const thumbnailUrl = typeof item.thumbnail_url === "string" ? item.thumbnail_url : null;
  const rawType = typeof item.media_type === "string" ? item.media_type : "OTHER";
  const timestamp = typeof item.timestamp === "string" ? item.timestamp : null;
  const publishedAt = timestamp ? new Date(timestamp) : null;
  const hashtags = caption ? extractHashtags(caption) : [];

  const metrics: { likes: number; comments: number; shares?: number; plays?: number } = {
    likes: typeof item.like_count === "number" ? item.like_count : 0,
    comments: typeof item.comments_count === "number" ? item.comments_count : 0,
  };

  const mediaType = mapMediaType(rawType);

  const childrenRows = Array.isArray((item.children as { data?: unknown[] })?.data)
    ? (item.children as { data: unknown[] }).data
    : Array.isArray(item.children)
      ? item.children
      : [];
  const children = childrenRows
    .map((child) => parseMediaItem(child, platform))
    .filter((c): c is MetaMediaItem => c !== null);

  return {
    id,
    externalId: id,
    platform,
    mediaType,
    caption,
    permalink,
    mediaUrl,
    thumbnailUrl,
    ownerUsername: null,
    publishedAt,
    hashtags,
    metrics,
    children,
  };
}

function mapMediaType(raw: string): MetaMediaItem["mediaType"] {
  switch (raw.toUpperCase()) {
    case "IMAGE":
      return "IMAGE";
    case "VIDEO":
      return "VIDEO";
    case "REEL":
      return "REEL";
    case "CAROUSEL_ALBUM":
    case "CAROUSEL":
      return "CAROUSEL";
    case "STORY":
      return "STORY";
    default:
      return "OTHER";
  }
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

function generateSampleMedia(query: string, limit: number): MetaMediaItem[] {
  const templates = [
    {
      caption: `POV: you just found the ultimate ${query} hack ✨ #${query} #viral #trending`,
      mediaType: "REEL" as const,
      likes: 12400,
      comments: 430,
    },
    {
      caption: `5 ${query} mistakes I wish I knew sooner 😤 Save this for later! #${query} #tips`,
      mediaType: "CAROUSEL" as const,
      likes: 8900,
      comments: 210,
    },
    {
      caption: `This ${query} transformation is INSANE 🔥 Which look is your fave? #${query} #style`,
      mediaType: "IMAGE" as const,
      likes: 5600,
      comments: 150,
    },
    {
      caption: `Day in the life: running a ${query} brand from my phone 📱 #${query} #behindthescenes`,
      mediaType: "VIDEO" as const,
      likes: 7200,
      comments: 310,
    },
    {
      caption: `The ${query} trend everyone is talking about — here's how to do it #${query} #howto`,
      mediaType: "REEL" as const,
      likes: 15300,
      comments: 620,
    },
  ];
  const now = Date.now();
  const items: MetaMediaItem[] = [];
  for (let i = 0; i < limit; i++) {
    const t = templates[i % templates.length];
    const owner = ["the.creator.lab", "niche.daily", "trendsetters", "daily.inspo", "viral.feed"][i % 5];
    const id = `mock-${query}-${i}`;
    items.push({
      id,
      externalId: id,
      platform: "INSTAGRAM",
      mediaType: t.mediaType,
      caption: t.caption,
      permalink: `https://instagram.com/p/MOCK${i}`,
      mediaUrl: null,
      thumbnailUrl: `https://placehold.co/600x400?text=${encodeURIComponent(t.mediaType)}`,
      ownerUsername: owner,
      publishedAt: new Date(now - i * 86400000),
      hashtags: [`#${query}`, "#viral", "#trending"],
      metrics: { likes: t.likes, comments: t.comments },
    });
  }
  return items;
}

function generateSampleCompetitorMedia(handle: string, limit: number): MetaMediaItem[] {
  const templates = [
    {
      caption: `POV: you just found the ultimate ${handle} hack ✨ #${handle} #viral #trending`,
      mediaType: "REEL" as const,
      likes: 12400,
      comments: 430,
    },
    {
      caption: `5 ${handle} mistakes I wish I knew sooner 😤 Save this for later! #${handle} #tips`,
      mediaType: "CAROUSEL" as const,
      likes: 8900,
      comments: 210,
    },
    {
      caption: `This ${handle} transformation is INSANE 🔥 Which look is your fave? #${handle} #style`,
      mediaType: "IMAGE" as const,
      likes: 5600,
      comments: 150,
    },
    {
      caption: `Day in the life: running a ${handle} brand from my phone 📱 #${handle} #behindthescenes`,
      mediaType: "VIDEO" as const,
      likes: 7200,
      comments: 310,
    },
    {
      caption: `The ${handle} trend everyone is talking about — here's how to do it #${handle} #howto`,
      mediaType: "REEL" as const,
      likes: 15300,
      comments: 620,
    },
  ];
  const now = Date.now();
  const items: MetaMediaItem[] = [];
  for (let i = 0; i < limit; i++) {
    const t = templates[i % templates.length];
    const id = `mock-${handle}-${i}`;
    items.push({
      id,
      externalId: id,
      platform: "INSTAGRAM",
      mediaType: t.mediaType,
      caption: t.caption,
      permalink: `https://instagram.com/p/MOCK-${handle}-${i}`,
      mediaUrl: null,
      thumbnailUrl: `https://placehold.co/600x400?text=${encodeURIComponent(t.mediaType)}`,
      ownerUsername: handle,
      publishedAt: new Date(now - i * 86400000),
      hashtags: [`#${handle}`, "#viral", "#trending"],
      metrics: { likes: t.likes, comments: t.comments },
    });
  }
  return items;
}

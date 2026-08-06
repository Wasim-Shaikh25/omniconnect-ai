import crypto from "crypto";
import { env } from "@/shared/config";
import { logger, withSpan } from "@/shared/observability";
import { rateLimit, type RateLimitResult, type RateLimitStore } from "@/shared/security/rate-limit";
import type { ConnectorOrder } from "@/modules/ecommerce";
import { MetaRateLimitError } from "../domain/errors";
import type {
  MetaIntegrationRepository,
  MetaMediaItem,
  MetaService,
  HashtagMediaOptions,
  CompetitorMediaOptions,
  MetaPageInsights,
  MetaAudienceInsights,
  AudienceDemographics,
  MetaMediaMetrics,
  PublishMediaInput,
  PublishMediaResult,
} from "../application/ports";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const REQUEST_TIMEOUT_MS = 15000;
const GRAPH_API_HOURLY_LIMIT = 200;
const GRAPH_API_WINDOW_MS = 60 * 60 * 1000;

function withTimeout(init: RequestInit = {}): RequestInit {
  return { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
}

/**
 * Outbound Graph API adapter. Config-gated: without a stored page token (or in
 * dev) it no-ops after logging, so the rest of the flow works without a live
 * Meta app. Tokens are read from infrastructure and never logged.
 */
export class GraphApiMetaService implements MetaService {
  constructor(
    private readonly integrations: MetaIntegrationRepository,
    private readonly rateLimitStore?: RateLimitStore,
  ) {}

  private async consumeRateLimit(projectId: string): Promise<RateLimitResult> {
    const result = await rateLimit({
      key: `meta:graph:${projectId}`,
      limit: GRAPH_API_HOURLY_LIMIT,
      windowMs: GRAPH_API_WINDOW_MS,
      store: this.rateLimitStore,
    });
    if (!result.allowed) {
      logger.warn("meta.rateLimit.exceeded", { projectId, resetAt: result.resetAt });
      throw new MetaRateLimitError(result.resetAt);
    }
    return result;
  }

  private async graphApiFetch(
    projectId: string,
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response> {
    await this.consumeRateLimit(projectId);
    return fetch(input, init);
  }

  async sendMessage(input: {
    projectId: string;
    recipientId: string;
    text: string;
  }): Promise<void> {
    return withSpan(
      "meta.sendMessage",
      async () => {
        const projectId = input.projectId;
        const token = await this.integrations.findAccessToken(projectId);
        if (!token || !env.META_APP_ID) {
          logger.info("meta.sendMessage.skipped", {
            projectId,
            reason: "not-configured",
          });
          return;
        }

        const res = await this.graphApiFetch(projectId, `${GRAPH_API_BASE}/me/messages`, withTimeout({
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipient: { id: input.recipientId },
            message: { text: input.text },
          }),
        }));

        if (!res.ok) {
          logger.warn("meta.sendMessage.failed", {
            projectId: input.projectId,
            status: res.status,
          });
          return;
        }

        logger.info("meta.sendMessage.ok", { projectId: input.projectId });
      },
      { attributes: { projectId: input.projectId } },
    );
  }

  async publishMedia(
    projectId: string,
    input: PublishMediaInput,
  ): Promise<PublishMediaResult | null> {
    return withSpan(
      "meta.publishMedia",
      async () => {
        const token = await this.integrations.findAccessToken(projectId);
        const integration = await this.integrations.findByStore(projectId);
        if (!token || !integration?.accountId) {
          logger.info("meta.publishMedia.skipped", { projectId, reason: "not-configured" });
          return null;
        }

        const accountId = integration.accountId;
        if (input.mediaUrls.length === 0) {
          logger.warn("meta.publishMedia.invalid", { projectId, reason: "no-media-urls" });
          return null;
        }

        try {
          const creationId = await this.createMediaContainer(projectId, accountId, token, input);
          const status = await this.pollContainerStatus(projectId, creationId, accountId, token);
          if (status === "ERROR") {
            logger.warn("meta.publishMedia.containerError", { projectId, creationId });
            return null;
          }

          const publishRes = await this.graphApiFetch(projectId, 
            `${GRAPH_API_BASE}/${accountId}/media_publish?creation_id=${creationId}`,
            withTimeout({ method: "POST" }),
          );
          if (!publishRes.ok) {
            const text = await publishRes.text();
            logger.warn("meta.publishMedia.publishFailed", {
              projectId,
              status: publishRes.status,
              body: text,
            });
            return null;
          }
          const publishBody = (await publishRes.json()) as { id?: string };
          const externalId = publishBody.id;
          if (!externalId) {
            logger.warn("meta.publishMedia.noId", { projectId, creationId, publishBody });
            return null;
          }

          logger.info("meta.publishMedia.ok", { projectId, externalId });
          return { externalId };
        } catch (error) {
          logger.error("meta.publishMedia.error", {
            projectId,
            error: error instanceof Error ? error.message : "unknown",
          });
          return null;
        }
      },
      { attributes: { projectId, mediaType: input.mediaType, mediaUrls: input.mediaUrls.length } },
    );
  }

  async searchHashtag(
    projectId: string,
    query: string,
  ): Promise<{ hashtagId: string | null; userId: string | null }> {
    const token = await this.integrations.findAccessToken(projectId);
    const integration = await this.integrations.findByStore(projectId);
    if (!token || !integration?.accountId) {
      logger.info("meta.searchHashtag.skipped", { projectId, query, reason: "not-configured" });
      if (env.NODE_ENV !== "production") {
        return { hashtagId: `mock-hashtag-${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, userId: "mock-user" };
      }
      return { hashtagId: null, userId: null };
    }

    try {
      const url = new URL(`${GRAPH_API_BASE}/ig_hashtag_search`);
      url.searchParams.set("user_id", integration.accountId);
      url.searchParams.set("q", query);
      const res = await this.graphApiFetch(projectId, url.toString(), withTimeout({
        headers: { authorization: `Bearer ${token}` },
      }));
      if (!res.ok) {
        logger.warn("meta.searchHashtag.failed", { projectId, query, status: res.status });
        return { hashtagId: null, userId: integration.accountId };
      }
      const payload: unknown = await res.json();
      const data = (payload as { data?: { id: string }[] }).data;
      return { hashtagId: data?.[0]?.id ?? null, userId: integration.accountId };
    } catch (error) {
      logger.error("meta.searchHashtag.error", {
        projectId,
        query,
        error: error instanceof Error ? error.message : "unknown",
      });
      return { hashtagId: null, userId: integration.accountId };
    }
  }

  async getHashtagMedia(
    projectId: string,
    hashtagId: string,
    options: HashtagMediaOptions = { top: true, limit: 10 },
  ): Promise<MetaMediaItem[]> {
    const token = await this.integrations.findAccessToken(projectId);
    const integration = await this.integrations.findByStore(projectId);
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
    if (!token || !integration?.accountId) {
      logger.info("meta.getHashtagMedia.skipped", { projectId, hashtagId, reason: "not-configured" });
      if (env.NODE_ENV !== "production") {
        return generateSampleMedia(hashtagId.replace(/^mock-hashtag-/, ""), limit);
      }
      return [];
    }

    const kind = options.recent ? "recent_media" : "top_media";
    const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{id,media_type,media_url,permalink,caption,timestamp,thumbnail_url}";
    const url = new URL(`${GRAPH_API_BASE}/${hashtagId}/${kind}`);
    url.searchParams.set("user_id", integration.accountId);
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", String(limit));

    try {
      const res = await this.graphApiFetch(projectId, url.toString(), withTimeout({
        headers: { authorization: `Bearer ${token}` },
      }));
      if (!res.ok) {
        logger.warn("meta.getHashtagMedia.failed", { projectId, hashtagId, status: res.status });
        return [];
      }
      const payload: unknown = await res.json();
      const rows = (payload as { data?: unknown[] }).data ?? [];
      return rows.map((row) => parseMediaItem(row, "INSTAGRAM")).filter((m): m is MetaMediaItem => m !== null);
    } catch (error) {
      logger.error("meta.getHashtagMedia.error", {
        projectId,
        hashtagId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }

  async getAccountMedia(projectId: string, limit = 10): Promise<MetaMediaItem[]> {
    const token = await this.integrations.findAccessToken(projectId);
    const integration = await this.integrations.findByStore(projectId);
    if (!token || !integration?.accountId) {
      logger.info("meta.getAccountMedia.skipped", { projectId, reason: "not-configured" });
      return [];
    }

    const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{id,media_type,media_url,permalink,caption,timestamp,thumbnail_url}";
    const url = new URL(`${GRAPH_API_BASE}/${integration.accountId}/media`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", String(Math.min(limit, 25)));

    try {
      const res = await this.graphApiFetch(projectId, url.toString(), withTimeout({
        headers: { authorization: `Bearer ${token}` },
      }));
      if (!res.ok) {
        logger.warn("meta.getAccountMedia.failed", { projectId, status: res.status });
        return [];
      }
      const payload: unknown = await res.json();
      const rows = (payload as { data?: unknown[] }).data ?? [];
      const items = rows.map((row) => parseMediaItem(row, "INSTAGRAM")).filter((m): m is MetaMediaItem => m !== null);
      await Promise.all(
        items.map(async (item) => {
          const insights = await this.fetchMediaInsights(projectId, item.externalId, token);
          item.metrics = { ...item.metrics, ...insights };
        }),
      );
      return items;
    } catch (error) {
      logger.error("meta.getAccountMedia.error", {
        projectId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }

  async getPageInsights(
    projectId: string,
    days = 7,
  ): Promise<MetaPageInsights | null> {
    return withSpan(
      "meta.getPageInsights",
      async () => {
        const token = await this.integrations.findAccessToken(projectId);
        const integration = await this.integrations.findByStore(projectId);
        if (!token || !integration?.accountId) {
          logger.info("meta.getPageInsights.skipped", { projectId, reason: "not-configured" });
          return null;
        }

        try {
          const accountUrl = new URL(`${GRAPH_API_BASE}/${integration.accountId}`);
          accountUrl.searchParams.set("fields", "username,followers_count,media_count");
          const accountRes = await this.graphApiFetch(projectId, accountUrl.toString(), withTimeout({
            headers: { authorization: `Bearer ${token}` },
          }));
          const account: unknown = accountRes.ok ? await accountRes.json() : {};
          const accountJson = account as Record<string, unknown>;

          const since = Math.floor(Date.now() / 1000) - days * 86400;
          const until = Math.floor(Date.now() / 1000);
          const insightsUrl = new URL(`${GRAPH_API_BASE}/${integration.accountId}/insights`);
          insightsUrl.searchParams.set("metric", "impressions,reach,profile_views");
          insightsUrl.searchParams.set("period", "day");
          insightsUrl.searchParams.set("since", String(since));
          insightsUrl.searchParams.set("until", String(until));

          const insightsRes = await this.graphApiFetch(projectId, insightsUrl.toString(), withTimeout({
            headers: { authorization: `Bearer ${token}` },
          }));
          const insights: unknown = insightsRes.ok ? await insightsRes.json() : {};
          const data = Array.isArray((insights as { data?: unknown[] }).data)
            ? (insights as { data: unknown[] }).data
            : [];
          const summed = sumInsightData(data);

          return {
            username: typeof accountJson.username === "string" ? accountJson.username : null,
            followers: typeof accountJson.followers_count === "number" ? accountJson.followers_count : null,
            mediaCount: typeof accountJson.media_count === "number" ? accountJson.media_count : null,
            impressions: summed.impressions,
            reach: summed.reach,
            profileViews: summed.profileViews,
          };
        } catch (error) {
          logger.error("meta.getPageInsights.error", {
            projectId,
            error: error instanceof Error ? error.message : "unknown",
          });
          return null;
        }
      },
      { attributes: { projectId, days } },
    );
  }

  async getAudienceInsights(
    projectId: string,
  ): Promise<MetaAudienceInsights | null> {
    return withSpan(
      "meta.getAudienceInsights",
      async () => {
        const token = await this.integrations.findAccessToken(projectId);
        const integration = await this.integrations.findByStore(projectId);
        if (!token || !integration?.accountId) {
          logger.info("meta.getAudienceInsights.skipped", { projectId, reason: "not-configured" });
          return null;
        }

        const url = new URL(`${GRAPH_API_BASE}/${integration.accountId}/insights`);
        url.searchParams.set("metric", "audience_gender_age,audience_city,audience_country,audience_locale");
        url.searchParams.set("period", "lifetime");

        try {
          const res = await this.graphApiFetch(projectId, url.toString(), withTimeout({
            headers: { authorization: `Bearer ${token}` },
          }));
          if (!res.ok) {
            logger.warn("meta.getAudienceInsights.failed", { projectId, status: res.status });
            return null;
          }
          const payload: unknown = await res.json();
          const data = Array.isArray((payload as { data?: unknown[] }).data)
            ? (payload as { data: unknown[] }).data
            : [];

          const demographics: AudienceDemographics = {
            genderAge: {},
            cities: {},
            countries: {},
            locales: {},
          };

          for (const metric of data) {
            if (typeof metric !== "object" || metric === null) continue;
            const m = metric as Record<string, unknown>;
            const name = typeof m.name === "string" ? m.name : "";
            const firstValue = Array.isArray(m.values) ? m.values[0] : null;
            const value = typeof firstValue === "object" && firstValue !== null
              ? (firstValue as { value?: unknown }).value
              : null;

            if (name === "audience_gender_age" && typeof value === "object" && value !== null) {
              mergeDemographicObject(demographics.genderAge, value);
            } else if (name === "audience_city" && typeof value === "object" && value !== null) {
              mergeDemographicObject(demographics.cities, value);
            } else if (name === "audience_country" && typeof value === "object" && value !== null) {
              mergeDemographicObject(demographics.countries, value);
            } else if (name === "audience_locale" && typeof value === "object" && value !== null) {
              mergeDemographicObject(demographics.locales, value);
            }
          }

          return { demographics };
        } catch (error) {
          logger.error("meta.getAudienceInsights.error", {
            projectId,
            error: error instanceof Error ? error.message : "unknown",
          });
          return null;
        }
      },
      { attributes: { projectId } },
    );
  }

  private async fetchMediaInsights(
    projectId: string,
    mediaId: string,
    token: string,
  ): Promise<Partial<MetaMediaMetrics>> {
    const url = new URL(`${GRAPH_API_BASE}/${mediaId}/insights`);
    url.searchParams.set("metric", "engagement,impressions,reach,saved,profile_views,video_views");
    url.searchParams.set("period", "lifetime");

    try {
      const res = await this.graphApiFetch(projectId, url.toString(), withTimeout({
        headers: { authorization: `Bearer ${token}` },
      }));
      if (!res.ok) {
        logger.warn("meta.fetchMediaInsights.failed", { mediaId, status: res.status });
        return {};
      }
      const payload: unknown = await res.json();
      const data = Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : [];

      const result: Partial<MetaMediaMetrics> = {};
      for (const metric of data) {
        if (typeof metric !== "object" || metric === null) continue;
        const m = metric as Record<string, unknown>;
        const name = typeof m.name === "string" ? m.name : "";
        const firstValue = Array.isArray(m.values) ? m.values[0] : null;
        const value = typeof firstValue === "object" && firstValue !== null
          ? (firstValue as { value?: unknown }).value
          : null;
        if (typeof value !== "number") continue;

        if (name === "engagement") result.engagement = value;
        if (name === "impressions") result.impressions = value;
        if (name === "reach") result.reach = value;
        if (name === "saved") result.saved = value;
        if (name === "profile_views") result.profileViews = value;
        if (name === "video_views") result.videoViews = value;
      }
      return result;
    } catch (error) {
      logger.warn("meta.fetchMediaInsights.error", {
        mediaId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return {};
    }
  }

  async getCompetitorMedia(
    projectId: string,
    handle: string,
    options: CompetitorMediaOptions = {},
  ): Promise<MetaMediaItem[]> {
    return withSpan(
      "meta.getCompetitorMedia",
      async () => {
        const token = await this.integrations.findAccessToken(projectId);
        const integration = await this.integrations.findByStore(projectId);
        const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
        if (!token || !integration?.accountId) {
          logger.info("meta.getCompetitorMedia.skipped", { projectId, handle, reason: "not-configured" });
          if (env.NODE_ENV !== "production") {
            return generateSampleCompetitorMedia(handle, limit);
          }
          return [];
        }

        const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{id,media_type,media_url,permalink,caption,timestamp,thumbnail_url}";
        const url = new URL(`${GRAPH_API_BASE}/${integration.accountId}`);
        url.searchParams.set(
          "fields",
          `business_discovery.username(${handle}){id,media{${fields}}}`,
        );

        try {
          const res = await this.graphApiFetch(projectId, url.toString(), withTimeout({
            headers: { authorization: `Bearer ${token}` },
          }));
          if (!res.ok) {
            logger.warn("meta.getCompetitorMedia.failed", { projectId, handle, status: res.status });
            return [];
          }
          const payload: unknown = await res.json();
          const media = (payload as { business_discovery?: { media?: { data?: unknown[] } } })?.business_discovery?.media?.data ?? [];
          return media.map((row) => parseMediaItem(row, "INSTAGRAM")).filter((m): m is MetaMediaItem => m !== null);
        } catch (error) {
          logger.error("meta.getCompetitorMedia.error", {
            projectId,
            handle,
            error: error instanceof Error ? error.message : "unknown",
          });
          return [];
        }
      },
      { attributes: { projectId, handle, limit: options.limit } },
    );
  }

  async getAccessToken(projectId: string): Promise<string | null> {
    return this.integrations.findAccessToken(projectId);
  }

  async getAccountId(projectId: string): Promise<string | null> {
    const integration = await this.integrations.findByStore(projectId);
    return integration?.accountId ?? null;
  }

  async getPixelId(projectId: string): Promise<string | null> {
    const integration = await this.integrations.findByStore(projectId);
    return integration?.pixelId ?? null;
  }

  async sendPurchaseEvent(projectId: string, order: ConnectorOrder): Promise<void> {
    const token = await this.integrations.findAccessToken(projectId);
    const pixelId = await this.getPixelId(projectId);
    if (!token || !pixelId) {
      logger.info("meta.sendPurchaseEvent.skipped", { projectId, reason: "not-configured" });
      return;
    }

    const hash = (value: string | null | undefined): string | null =>
      value ? crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex") : null;

    const eventId = `purchase_${order.externalId}_${order.createdAt.getTime()}`;
    const em = hash(order.customerEmail);
    const externalId = hash(order.customerRef);
    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(order.createdAt.getTime() / 1000),
          event_id: eventId,
          action_source: "website",
          user_data: {
            ...(em ? { em: [em] } : {}),
            ...(externalId ? { external_id: [externalId] } : {}),
          },
          custom_data: {
            currency: order.currency ?? "USD",
            value: order.total,
            content_ids: order.lineItems?.map((i) => i.externalId) ?? [],
            content_type: "product",
          },
        },
      ],
      access_token: token,
    };

    try {
      const res = await this.graphApiFetch(projectId, `${GRAPH_API_BASE}/${pixelId}/events`, withTimeout({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }));
      if (!res.ok) {
        logger.warn("meta.sendPurchaseEvent.failed", { projectId, status: res.status });
      } else {
        logger.info("meta.sendPurchaseEvent.ok", { projectId, eventId });
      }
    } catch (error) {
      logger.error("meta.sendPurchaseEvent.error", {
        projectId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  private async createMediaContainer(
    projectId: string,
    accountId: string,
    token: string,
    input: PublishMediaInput,
  ): Promise<string> {
    const { mediaType, mediaUrls, caption } = input;

    if (mediaType === "CAROUSEL") {
      const childIds: string[] = [];
      for (const url of mediaUrls) {
        const isVideo = isVideoUrl(url);
        const childParams = new URLSearchParams();
        childParams.set("is_carousel_item", "true");
        childParams.set("access_token", token);
        childParams.set(isVideo ? "video_url" : "image_url", url);
        if (isVideo) childParams.set("media_type", "VIDEO");
        const childRes = await this.graphApiFetch(projectId, 
          `${GRAPH_API_BASE}/${accountId}/media?${childParams.toString()}`,
          withTimeout({ method: "POST" }),
        );
        const childBody = (await parseJson(childRes)) as { id?: string };
        if (!childBody.id) {
          throw new Error(`Failed to create carousel child: ${JSON.stringify(childBody)}`);
        }
        childIds.push(childBody.id);
      }
      const parentParams = new URLSearchParams();
      parentParams.set("children", childIds.join(","));
      parentParams.set("access_token", token);
      if (caption) parentParams.set("caption", caption);
      const parentRes = await this.graphApiFetch(projectId, 
        `${GRAPH_API_BASE}/${accountId}/media?${parentParams.toString()}`,
        withTimeout({ method: "POST" }),
      );
      const parentBody = (await parseJson(parentRes)) as { id?: string };
      if (!parentBody.id) {
        throw new Error(`Failed to create carousel container: ${JSON.stringify(parentBody)}`);
      }
      return parentBody.id;
    }

    const firstUrl = mediaUrls[0];
    if (!firstUrl) {
      throw new Error("Cannot create media container without a media URL");
    }

    const params = new URLSearchParams();
    params.set("access_token", token);

    switch (mediaType) {
      case "IMAGE":
        params.set("image_url", firstUrl);
        break;
      case "VIDEO":
        params.set("video_url", firstUrl);
        params.set("media_type", "VIDEO");
        break;
      case "REEL":
        params.set("video_url", firstUrl);
        params.set("media_type", "REELS");
        break;
      case "STORY": {
        const isVideo = isVideoUrl(firstUrl);
        params.set(isVideo ? "video_url" : "image_url", firstUrl);
        params.set("media_type", "STORIES");
        break;
      }
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    if (caption) params.set("caption", caption);

    const res = await this.graphApiFetch(projectId, 
      `${GRAPH_API_BASE}/${accountId}/media?${params.toString()}`,
      withTimeout({ method: "POST" }),
    );
    const body = (await parseJson(res)) as { id?: string };
    if (!body.id) {
      throw new Error(`Failed to create media container: ${JSON.stringify(body)}`);
    }
    return body.id;
  }

  private async pollContainerStatus(
    projectId: string,
    creationId: string,
    _accountId: string,
    token: string,
    maxAttempts = 30,
    delayMs = 2000,
  ): Promise<"FINISHED" | "ERROR" | "TIMEOUT"> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      const res = await this.graphApiFetch(projectId, 
        `${GRAPH_API_BASE}/${creationId}?fields=status_code&access_token=${token}`,
        withTimeout(),
      );
      if (!res.ok) {
        logger.warn("meta.publishMedia.statusCheckFailed", {
          creationId,
          status: res.status,
        });
        return "ERROR";
      }
      const body = (await res.json()) as { status_code?: string; status?: string };
      const status = body.status_code ?? body.status;
      if (status === "FINISHED") return "FINISHED";
      if (status === "ERROR" || status === "EXPIRED") return "ERROR";
    }
    return "TIMEOUT";
  }
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|mkv)$/i.test(url);
}

async function parseJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${res.status}: ${text}`);
  }
  return res.json();
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

  const metrics: MetaMediaMetrics = {
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

function sumInsightData(data: unknown[]): {
  impressions: number | null;
  reach: number | null;
  profileViews: number | null;
} {
  let impressions = 0;
  let reach = 0;
  let profileViews = 0;
  let hasAny = false;

  for (const metric of data) {
    if (typeof metric !== "object" || metric === null) continue;
    const m = metric as Record<string, unknown>;
    const name = typeof m.name === "string" ? m.name : "";
    const values = Array.isArray(m.values) ? m.values : [];
    const total = values.reduce((acc: number, v: unknown) => {
      const value =
        typeof v === "object" && v !== null && typeof (v as { value?: unknown }).value === "number"
          ? (v as { value: number }).value
          : 0;
      return acc + value;
    }, 0);

    if (name === "impressions") {
      impressions += total;
      hasAny = true;
    } else if (name === "reach") {
      reach += total;
      hasAny = true;
    } else if (name === "profile_views") {
      profileViews += total;
      hasAny = true;
    }
  }

  if (!hasAny) return { impressions: null, reach: null, profileViews: null };
  return { impressions, reach, profileViews };
}

function mergeDemographicObject(
  target: Record<string, number>,
  source: unknown,
): void {
  if (typeof source !== "object" || source === null) return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") {
      target[key] = (target[key] ?? 0) + value;
    }
  }
}

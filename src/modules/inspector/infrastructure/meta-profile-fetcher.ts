import type { PublicProfile, PublicMedia, PublicComment } from "@/modules/inspector";
import type { ProfileFetcher } from "@/modules/inspector";

export class NoMetaAccessError extends Error {
  constructor() {
    super("Meta access token is not configured for this project");
  }
}

export class ProfileNotFoundError extends Error {
  constructor(username: string) {
    super(`Instagram profile not found: ${username}`);
  }
}

export class MetaApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(`Meta API error ${status}: ${message}`);
  }
}

export interface MetaProfileFetcherConfig {
  baseUrl?: string;
  apiVersion?: string;
  getAccessToken(projectId: string): Promise<string | null>;
  getAccountId(projectId: string): Promise<string | null>;
  fetch?: typeof fetch;
  mediaLimit?: number;
  commentLimit?: number;
  /** Consume one call from the shared Instagram Graph API rate-limit bucket per outbound request. */
  consumeGraphApiCall?(projectId: string): Promise<void>;
}

interface MediaItem {
  id: string;
  media_type: string;
  caption?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface BusinessDiscoveryResponse {
  business_discovery?: {
    followers_count?: number;
    media_count?: number;
    biography?: string;
    media?: {
      data?: MediaItem[];
    };
  } | null;
  error?: { message: string; code: number };
}

function mapMediaType(type: string): PublicMedia["type"] {
  switch (type) {
    case "VIDEO":
    case "REELS":
      return "reel";
    case "CAROUSEL_ALBUM":
      return "carousel";
    case "IMAGE":
    default:
      return "photo";
  }
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w\u00c0-\u024f\u0400-\u04ff]+/gi);
  return matches ?? [];
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
  projectId: string,
  consumeGraphApiCall?: (projectId: string) => Promise<void>,
): Promise<unknown> {
  if (consumeGraphApiCall) {
    await consumeGraphApiCall(projectId);
  }
  const response = await fetchImpl(url);
  const body = (await response.json()) as { error?: { message: string; code: number } };
  if (!response.ok || body.error) {
    const message = body.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 404 || body.error?.code === 803) {
      throw new ProfileNotFoundError("");
    }
    throw new MetaApiError(response.status, message);
  }
  return body;
}

export function makeMetaProfileFetcher(config: MetaProfileFetcherConfig): ProfileFetcher {
  const baseUrl = config.baseUrl ?? "https://graph.facebook.com";
  const version = config.apiVersion ?? "v18.0";
  const fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
  const mediaLimit = config.mediaLimit ?? 50;
  const commentLimit = config.commentLimit ?? 20;

  async function fetchComments(mediaId: string, accessToken: string, projectId: string): Promise<PublicComment[]> {
    const url = `${baseUrl}/${version}/${mediaId}/comments?fields=text&limit=${commentLimit}&access_token=${encodeURIComponent(accessToken)}`;
    try {
      const body = (await fetchJson(url, fetchImpl, projectId, config.consumeGraphApiCall)) as { data?: Array<{ text?: string }> };
      return (body.data ?? []).map((c) => ({ text: c.text ?? "" }));
    } catch (error) {
      if (
        error instanceof ProfileNotFoundError ||
        (error instanceof Error && error.name === "MetaRateLimitError")
      ) {
        return [];
      }
      throw error;
    }
  }

  return {
    async fetch(username: string, projectId: string): Promise<PublicProfile | null> {
      const accessToken = await config.getAccessToken(projectId);
      const accountId = await config.getAccountId(projectId);
      if (!accessToken || !accountId) {
        throw new NoMetaAccessError();
      }

      const fields = `business_discovery.username(${username}){followers_count,media_count,biography,media.limit(${mediaLimit}){id,media_type,caption,timestamp,like_count,comments_count,permalink}}`;
      const url = `${baseUrl}/${version}/${accountId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;

      const body = (await fetchJson(url, fetchImpl, projectId, config.consumeGraphApiCall)) as BusinessDiscoveryResponse;
      const discovery = body.business_discovery;
      if (!discovery) {
        throw new ProfileNotFoundError(username);
      }

      const mediaItems = discovery.media?.data ?? [];
      const commentsByMedia = await Promise.all(
        mediaItems.map((item) => fetchComments(item.id, accessToken, projectId)),
      );

      const allComments: PublicComment[] = commentsByMedia.flat();
      const media: PublicMedia[] = mediaItems.map((item) => {
        const caption = item.caption ?? "";
        return {
          id: item.id,
          type: mapMediaType(item.media_type),
          caption,
          timestamp: item.timestamp ?? new Date().toISOString(),
          likes: item.like_count ?? 0,
          comments: item.comments_count ?? 0,
          url: item.permalink ?? "",
          location: null,
          hashtags: extractHashtags(caption),
        };
      });

      return {
        username,
        followerCount: discovery.followers_count ?? 0,
        mediaCount: discovery.media_count ?? 0,
        bioLength: (discovery.biography ?? "").length,
        media,
        comments: allComments,
      };
    },
  };
}

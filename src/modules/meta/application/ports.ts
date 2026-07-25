import type { MetaChannel } from "../domain/types";

export interface MetaIntegrationRecord {
  id: string;
  storeId: string;
  channel: MetaChannel;
  accountId: string | null;
  connectedAt: Date;
}

export interface MetaIntegrationRepository {
  connect(input: {
    storeId: string;
    channel: MetaChannel;
    accountId: string | null;
    accessToken: string | null;
  }): Promise<MetaIntegrationRecord>;

  findByStore(storeId: string): Promise<MetaIntegrationRecord | null>;

  /** Resolve which store owns an inbound page/IG account. */
  findStoreByAccountId(accountId: string): Promise<string | null>;

  /** Read the stored page/IG token for outbound calls (infra-only). */
  findAccessToken(
    storeId: string,
    channel?: MetaChannel,
  ): Promise<string | null>;
}

export interface MetaMediaMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  plays?: number;
  impressions?: number;
  reach?: number;
}

export interface MetaMediaItem {
  id: string;
  externalId: string;
  platform: "INSTAGRAM" | "FACEBOOK";
  mediaType: "IMAGE" | "VIDEO" | "REEL" | "CAROUSEL" | "STORY" | "OTHER";
  caption: string | null;
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  ownerUsername: string | null;
  publishedAt: Date | null;
  hashtags: string[];
  metrics: MetaMediaMetrics;
  children?: MetaMediaItem[];
}

export interface HashtagMediaOptions {
  top?: boolean;
  recent?: boolean;
  limit?: number;
}

/** Outbound Graph API port (send replies, etc.). */
export interface MetaService {
  sendMessage(input: {
    storeId: string;
    recipientId: string;
    text: string;
  }): Promise<void>;

  /** Search the connected IG Business account for a hashtag id. */
  searchHashtag(
    storeId: string,
    query: string,
  ): Promise<{ hashtagId: string | null; userId: string | null }>;

  /** Fetch public top/recent media for a hashtag. */
  getHashtagMedia(
    storeId: string,
    hashtagId: string,
    options?: HashtagMediaOptions,
  ): Promise<MetaMediaItem[]>;

  /** Fetch the connected account's own media. */
  getAccountMedia(
    storeId: string,
    limit?: number,
  ): Promise<MetaMediaItem[]>;
}

import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis } from "@/modules/ai";
import type {
  MediaPost,
  MediaInsight,
  AccountInsight,
  TrendSnapshot,
  ContentRecommendation,
  Report,
} from "../domain/types";

export interface SuggestedCompetitor {
  handle: string;
  platform: string;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  totalLikes: number;
  totalComments: number;
  topCaption: string | null;
}

export interface TrackedAccountRecord {
  id: string;
  storeId: string;
  platform: string;
  handle: string;
  niche: string | null;
  note: string | null;
  lastMedia: MetaMediaItem[] | null;
  lastAnalysis: CompetitorAnalysis | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrackedAccountInput {
  storeId: string;
  platform?: string;
  handle: string;
  niche?: string | null;
  note?: string | null;
}

export interface UpdateTrackedAccountInput {
  niche?: string | null;
  note?: string | null;
  lastMedia?: MetaMediaItem[] | null;
  lastAnalysis?: CompetitorAnalysis | null;
  lastSyncedAt?: Date | null;
}

export interface TrackedAccountRepository {
  create(input: CreateTrackedAccountInput): Promise<TrackedAccountRecord>;
  listByStore(storeId: string): Promise<TrackedAccountRecord[]>;
  findById(id: string): Promise<TrackedAccountRecord | null>;
  update(id: string, input: UpdateTrackedAccountInput): Promise<TrackedAccountRecord>;
  delete(id: string, storeId: string): Promise<void>;
}

export interface UpsertMediaPostInput {
  trackedAccountId?: string | null;
  externalId: string;
  platform: string;
  mediaType: string;
  permalink?: string | null;
  caption?: string | null;
  hashtags?: string[];
  audioId?: string | null;
  audioName?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: Date | null;
}

export interface UpsertMediaInsightInput {
  impressions?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  plays?: number | null;
  views?: number | null;
  engagementRate?: number | null;
  fetchedAt?: Date;
}

export interface UpsertAccountInsightInput {
  date: Date;
  followers?: number | null;
  profileViews?: number | null;
  reach?: number | null;
  impressions?: number | null;
  websiteClicks?: number | null;
  audienceJson?: Record<string, unknown> | null;
  fetchedAt?: Date;
}

export interface CreateTrendSnapshotInput {
  type: "HASHTAG" | "AUDIO" | "NICHE";
  query: string;
  data: Record<string, unknown>;
  fetchedAt?: Date;
}

export interface CreateContentRecommendationInput {
  type: string;
  title: string;
  outline: string;
  hashtags: string[];
  audioSuggestion?: string | null;
  basedOnMediaIds: string[];
}

export interface CreateReportInput {
  period: "WEEKLY" | "MONTHLY";
  content: Record<string, unknown>;
  generatedAt?: Date;
}

export interface MarketingInsightsRepository {
  upsertMediaPost(storeId: string, input: UpsertMediaPostInput): Promise<MediaPost>;
  upsertMediaInsight(mediaPostId: string, input: UpsertMediaInsightInput): Promise<MediaInsight>;
  listMediaPosts(
    storeId: string,
    options?: { limit?: number; offset?: number; mediaType?: string; since?: Date },
  ): Promise<MediaPost[]>;
  getMediaPostById(id: string): Promise<MediaPost | null>;
  getMediaPostByExternalId(storeId: string, externalId: string): Promise<MediaPost | null>;
  upsertAccountInsight(storeId: string, input: UpsertAccountInsightInput): Promise<AccountInsight>;
  getLatestAccountInsight(storeId: string): Promise<AccountInsight | null>;
  createTrendSnapshot(storeId: string, input: CreateTrendSnapshotInput): Promise<TrendSnapshot>;
  listTrendSnapshots(
    storeId: string,
    options?: { type?: "HASHTAG" | "AUDIO" | "NICHE"; query?: string; limit?: number },
  ): Promise<TrendSnapshot[]>;
  createContentRecommendation(storeId: string, input: CreateContentRecommendationInput): Promise<ContentRecommendation>;
  listContentRecommendations(storeId: string, limit?: number): Promise<ContentRecommendation[]>;
  createReport(storeId: string, input: CreateReportInput): Promise<Report>;
  listReports(storeId: string, limit?: number): Promise<Report[]>;
}

import { prisma } from "@/shared/database";
import { Prisma, MediaType as PrismaMediaType, TrendSnapshotType as PrismaTrendSnapshotType, ReportPeriod as PrismaReportPeriod } from "@prisma/client";
import type { MediaPost, MediaInsight, AccountInsight, TrendSnapshot, ContentRecommendation, Report } from "../domain/types";
import type {
  MarketingInsightsRepository,
  UpsertMediaPostInput,
  UpsertMediaInsightInput,
  UpsertAccountInsightInput,
  CreateTrendSnapshotInput,
  CreateContentRecommendationInput,
  CreateReportInput,
} from "../application/ports";

function mapMediaPost(row: {
  id: string;
  storeId: string;
  trackedAccountId: string | null;
  externalId: string;
  platform: string;
  mediaType: string;
  permalink: string | null;
  caption: string | null;
  hashtags: string[];
  audioId: string | null;
  audioName: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  insights: { id: string; mediaPostId: string; impressions: number | null; reach: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null; plays: number | null; views: number | null; engagementRate: Prisma.Decimal | null; fetchedAt: Date }[];
}): MediaPost {
  const latest = row.insights[0];
  return {
    id: row.id,
    storeId: row.storeId,
    trackedAccountId: row.trackedAccountId,
    externalId: row.externalId,
    platform: row.platform,
    mediaType: row.mediaType as MediaPost["mediaType"],
    permalink: row.permalink,
    caption: row.caption,
    hashtags: row.hashtags,
    audioId: row.audioId,
    audioName: row.audioName,
    thumbnailUrl: row.thumbnailUrl,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    latestInsight: latest
      ? {
          id: latest.id,
          mediaPostId: latest.mediaPostId,
          impressions: latest.impressions,
          reach: latest.reach,
          likes: latest.likes,
          comments: latest.comments,
          shares: latest.shares,
          saves: latest.saves,
          plays: latest.plays,
          views: latest.views,
          engagementRate: latest.engagementRate ? Number(latest.engagementRate) : null,
          fetchedAt: latest.fetchedAt,
        }
      : null,
  };
}

function mapMediaInsight(row: {
  id: string;
  mediaPostId: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  plays: number | null;
  views: number | null;
  engagementRate: Prisma.Decimal | null;
  fetchedAt: Date;
}): MediaInsight {
  return {
    id: row.id,
    mediaPostId: row.mediaPostId,
    impressions: row.impressions,
    reach: row.reach,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    saves: row.saves,
    plays: row.plays,
    views: row.views,
    engagementRate: row.engagementRate ? Number(row.engagementRate) : null,
    fetchedAt: row.fetchedAt,
  };
}

function mapAccountInsight(row: {
  id: string;
  storeId: string;
  date: Date;
  followers: number | null;
  profileViews: number | null;
  reach: number | null;
  impressions: number | null;
  websiteClicks: number | null;
  audienceJson: Prisma.JsonValue;
  fetchedAt: Date;
}): AccountInsight {
  return {
    id: row.id,
    storeId: row.storeId,
    date: row.date,
    followers: row.followers,
    profileViews: row.profileViews,
    reach: row.reach,
    impressions: row.impressions,
    websiteClicks: row.websiteClicks,
    audienceJson: (row.audienceJson as Record<string, unknown>) ?? null,
    fetchedAt: row.fetchedAt,
  };
}

function mapTrendSnapshot(row: {
  id: string;
  storeId: string;
  type: string;
  query: string;
  data: Prisma.JsonValue;
  fetchedAt: Date;
}): TrendSnapshot {
  return {
    id: row.id,
    storeId: row.storeId,
    type: row.type as TrendSnapshot["type"],
    query: row.query,
    data: (row.data as Record<string, unknown>) ?? {},
    fetchedAt: row.fetchedAt,
  };
}

function mapContentRecommendation(row: {
  id: string;
  storeId: string;
  type: string;
  title: string;
  outline: string;
  hashtags: string[];
  audioSuggestion: string | null;
  generatedAt: Date;
  basedOnMediaIds: Prisma.JsonValue;
}): ContentRecommendation {
  return {
    id: row.id,
    storeId: row.storeId,
    type: row.type,
    title: row.title,
    outline: row.outline,
    hashtags: row.hashtags,
    audioSuggestion: row.audioSuggestion,
    generatedAt: row.generatedAt,
    basedOnMediaIds: Array.isArray(row.basedOnMediaIds) ? (row.basedOnMediaIds as string[]) : [],
  };
}

function mapReport(row: { id: string; storeId: string; period: string; content: Prisma.JsonValue; generatedAt: Date }): Report {
  return {
    id: row.id,
    storeId: row.storeId,
    period: row.period as Report["period"],
    content: (row.content as Record<string, unknown>) ?? {},
    generatedAt: row.generatedAt,
  };
}

export class PrismaMarketingInsightsRepository implements MarketingInsightsRepository {
  async upsertMediaPost(storeId: string, input: UpsertMediaPostInput): Promise<MediaPost> {
    const existing = await prisma.mediaPost.findFirst({
      where: { storeId, externalId: input.externalId },
      include: { insights: { orderBy: { fetchedAt: "desc" }, take: 1 } },
    });

    const data = {
      storeId,
      trackedAccountId: input.trackedAccountId ?? null,
      externalId: input.externalId,
      platform: input.platform,
      mediaType: input.mediaType as unknown as PrismaMediaType,
      permalink: input.permalink ?? null,
      caption: input.caption ?? null,
      hashtags: input.hashtags ?? [],
      audioId: input.audioId ?? null,
      audioName: input.audioName ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      publishedAt: input.publishedAt ?? null,
    };

    const row = existing
      ? await prisma.mediaPost.update({
          where: { id: existing.id },
          data,
          include: { insights: { orderBy: { fetchedAt: "desc" }, take: 1 } },
        })
      : await prisma.mediaPost.create({
          data,
          include: { insights: { orderBy: { fetchedAt: "desc" }, take: 1 } },
        });

    return mapMediaPost(row);
  }

  async upsertMediaInsight(mediaPostId: string, input: UpsertMediaInsightInput): Promise<MediaInsight> {
    const row = await prisma.mediaInsight.create({
      data: {
        mediaPostId,
        impressions: input.impressions ?? null,
        reach: input.reach ?? null,
        likes: input.likes ?? null,
        comments: input.comments ?? null,
        shares: input.shares ?? null,
        saves: input.saves ?? null,
        plays: input.plays ?? null,
        views: input.views ?? null,
        engagementRate: input.engagementRate ?? null,
        fetchedAt: input.fetchedAt ?? new Date(),
      },
    });
    return mapMediaInsight(row);
  }

  async listMediaPosts(
    storeId: string,
    options?: { limit?: number; offset?: number; mediaType?: string; since?: Date },
  ): Promise<MediaPost[]> {
    const rows = await prisma.mediaPost.findMany({
      where: {
        storeId,
        ...(options?.mediaType ? { mediaType: options.mediaType as unknown as PrismaMediaType } : {}),
        ...(options?.since ? { publishedAt: { gte: options.since } } : {}),
      },
      include: { insights: { orderBy: { fetchedAt: "desc" }, take: 1 } },
      orderBy: { publishedAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
    return rows.map(mapMediaPost);
  }

  async getMediaPostById(id: string): Promise<MediaPost | null> {
    const row = await prisma.mediaPost.findUnique({
      where: { id },
      include: { insights: { orderBy: { fetchedAt: "desc" }, take: 1 } },
    });
    return row ? mapMediaPost(row) : null;
  }

  async getMediaPostByExternalId(storeId: string, externalId: string): Promise<MediaPost | null> {
    const row = await prisma.mediaPost.findFirst({
      where: { storeId, externalId },
      include: { insights: { orderBy: { fetchedAt: "desc" }, take: 1 } },
    });
    return row ? mapMediaPost(row) : null;
  }

  async upsertAccountInsight(storeId: string, input: UpsertAccountInsightInput): Promise<AccountInsight> {
    const existing = await prisma.accountInsight.findFirst({
      where: { storeId, date: input.date },
    });

    const data = {
      storeId,
      date: input.date,
      followers: input.followers ?? null,
      profileViews: input.profileViews ?? null,
      reach: input.reach ?? null,
      impressions: input.impressions ?? null,
      websiteClicks: input.websiteClicks ?? null,
      audienceJson: (input.audienceJson as unknown as Prisma.InputJsonValue) ?? Prisma.DbNull,
      fetchedAt: input.fetchedAt ?? new Date(),
    };

    const row = existing
      ? await prisma.accountInsight.update({ where: { id: existing.id }, data })
      : await prisma.accountInsight.create({ data });

    return mapAccountInsight(row);
  }

  async getLatestAccountInsight(storeId: string): Promise<AccountInsight | null> {
    const row = await prisma.accountInsight.findFirst({
      where: { storeId },
      orderBy: { date: "desc" },
    });
    return row ? mapAccountInsight(row) : null;
  }

  async createTrendSnapshot(storeId: string, input: CreateTrendSnapshotInput): Promise<TrendSnapshot> {
    const row = await prisma.trendSnapshot.create({
      data: {
        storeId,
        type: input.type as unknown as PrismaTrendSnapshotType,
        query: input.query,
        data: input.data as unknown as Prisma.InputJsonValue,
        fetchedAt: input.fetchedAt ?? new Date(),
      },
    });
    return mapTrendSnapshot(row);
  }

  async listTrendSnapshots(
    storeId: string,
    options?: { type?: "HASHTAG" | "AUDIO" | "NICHE"; query?: string; limit?: number },
  ): Promise<TrendSnapshot[]> {
    const rows = await prisma.trendSnapshot.findMany({
      where: {
        storeId,
        ...(options?.type ? { type: options.type as unknown as PrismaTrendSnapshotType } : {}),
        ...(options?.query ? { query: { contains: options.query, mode: "insensitive" as const } } : {}),
      },
      orderBy: { fetchedAt: "desc" },
      take: options?.limit ?? 50,
    });
    return rows.map(mapTrendSnapshot);
  }

  async createContentRecommendation(
    storeId: string,
    input: CreateContentRecommendationInput,
  ): Promise<ContentRecommendation> {
    const row = await prisma.contentRecommendation.create({
      data: {
        storeId,
        type: input.type,
        title: input.title,
        outline: input.outline,
        hashtags: input.hashtags,
        audioSuggestion: input.audioSuggestion ?? null,
        basedOnMediaIds: input.basedOnMediaIds as unknown as Prisma.InputJsonValue,
      },
    });
    return mapContentRecommendation(row);
  }

  async listContentRecommendations(storeId: string, limit = 50): Promise<ContentRecommendation[]> {
    const rows = await prisma.contentRecommendation.findMany({
      where: { storeId },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });
    return rows.map(mapContentRecommendation);
  }

  async createReport(storeId: string, input: CreateReportInput): Promise<Report> {
    const row = await prisma.report.create({
      data: {
        storeId,
        period: input.period as unknown as PrismaReportPeriod,
        content: input.content as unknown as Prisma.InputJsonValue,
        generatedAt: input.generatedAt ?? new Date(),
      },
    });
    return mapReport(row);
  }

  async listReports(storeId: string, limit = 50): Promise<Report[]> {
    const rows = await prisma.report.findMany({
      where: { storeId },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });
    return rows.map(mapReport);
  }
}

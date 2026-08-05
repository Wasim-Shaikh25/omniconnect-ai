import { prisma } from "@/shared/database";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { CrmQueries } from "@/modules/crm";
import type { SocialQueries } from "@/modules/social";
import type { AnalysisSpec, AnalysisOperation, MetricName } from "../domain/analysis";
import type { MediaPost, AccountInsight } from "../domain/types";
import type { MarketingInsightsRepository } from "../application/ports";
import type { ScoredPost } from "../application/operations/stats";
import type { SinglePostDataset } from "../application/operations/single-post-analysis";
import type { TopNDataset } from "../application/operations/top-n";
import type { BestTimeDataset, BestTimeMediaInput } from "../application/operations/best-time";
import type { ComparePeriodDataset } from "../application/operations/compare-period";
import type { AnomalyCheckDataset } from "../application/operations/anomaly-check";
import type { CohortTrendDataset } from "../application/operations/cohort-trend";
import type { AttributionBreakdownDataset, AttributionRecord } from "../application/operations/attribution-breakdown";
import type { ProfileQualityDataset } from "../application/operations/profile-quality";

export interface PrismaDatasetFetcherDeps {
  ecommerce: Pick<EcommerceQueries, "listOrders">;
  crm: Pick<CrmQueries, "listFollowers">;
  social: Pick<SocialQueries, "listComments">;
  marketingInsights: MarketingInsightsRepository;
}

interface OrderSummary {
  orderDate: Date;
  total: number | null;
  couponCode: string | null;
  attributedMediaId: string | null;
  attributionSource: string | null;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function normalizeDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateRange(
  range?: { from?: string; to?: string },
  fallbackDays = 7,
  offsetDays = 0,
): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - fallbackDays);

  const parsedEnd = normalizeDate(range?.to);
  if (parsedEnd) {
    parsedEnd.setHours(23, 59, 59, 999);
    end.setTime(parsedEnd.getTime());
  }

  const parsedStart = normalizeDate(range?.from);
  if (parsedStart) {
    start.setTime(parsedStart.getTime());
  }

  if (offsetDays !== 0) {
    const delta = offsetDays * 24 * 60 * 60 * 1000;
    start.setTime(start.getTime() + delta);
    end.setTime(end.getTime() + delta);
  }

  return { start, end };
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function emptyScoredPost(id = "none"): ScoredPost {
  return {
    id,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    plays: 0,
    views: 0,
    reach: 0,
    impressions: 0,
  };
}

function toScoredPost(media: MediaPost): ScoredPost {
  const insight = media.latestInsight;
  return {
    id: media.id,
    likes: insight?.likes ?? 0,
    comments: insight?.comments ?? 0,
    shares: insight?.shares ?? 0,
    saves: insight?.saves ?? 0,
    plays: insight?.plays ?? 0,
    views: insight?.views ?? 0,
    reach: insight?.reach ?? 0,
    impressions: insight?.impressions ?? 0,
  };
}

function toBestTimeMediaInput(media: MediaPost): BestTimeMediaInput {
  const insight = media.latestInsight;
  return {
    publishedAt: media.publishedAt,
    metrics: {
      likes: insight?.likes ?? 0,
      comments: insight?.comments ?? 0,
      shares: insight?.shares ?? 0,
      saved: insight?.saves ?? 0,
      plays: insight?.plays ?? 0,
      videoViews: insight?.views ?? 0,
    },
  };
}

type DailyBucket = {
  revenue: number;
  orders: number;
  engagementTotal: number;
  engagementPosts: number;
  followers: number | null;
};

function buildDailyBuckets(
  start: Date,
  end: Date,
  orders: OrderSummary[],
  media: MediaPost[],
  insights: AccountInsight[],
): Map<string, DailyBucket> {
  const buckets = new Map<string, DailyBucket>();

  const days = daysBetween(start, end);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets.set(toISODate(d), {
      revenue: 0,
      orders: 0,
      engagementTotal: 0,
      engagementPosts: 0,
      followers: null,
    });
  }

  for (const order of orders) {
    if (order.orderDate < start || order.orderDate > end) continue;
    const key = toISODate(order.orderDate);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += order.total ?? 0;
    bucket.orders += 1;
  }

  for (const m of media) {
    if (!m.publishedAt || m.publishedAt < start || m.publishedAt > end) continue;
    const key = toISODate(m.publishedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const score =
      (m.latestInsight?.likes ?? 0) +
      (m.latestInsight?.comments ?? 0) * 2 +
      (m.latestInsight?.shares ?? 0) * 3 +
      (m.latestInsight?.saves ?? 0) * 2 +
      (m.latestInsight?.plays ?? 0) * 0.1 +
      (m.latestInsight?.views ?? 0) * 0.1;
    bucket.engagementTotal += score;
    bucket.engagementPosts += 1;
  }

  for (const insight of insights) {
    if (insight.date < start || insight.date > end) continue;
    const key = toISODate(insight.date);
    const bucket = buckets.get(key);
    if (bucket && insight.followers != null) {
      bucket.followers = insight.followers;
    }
  }

  return buckets;
}

function metricValue(bucket: DailyBucket, metric: MetricName): number {
  switch (metric) {
    case "revenue":
      return bucket.revenue;
    case "orders":
      return bucket.orders;
    case "aov":
      return bucket.orders > 0 ? bucket.revenue / bucket.orders : 0;
    case "engagement":
      return bucket.engagementPosts > 0 ? bucket.engagementTotal / bucket.engagementPosts : 0;
    case "followers":
      return bucket.followers ?? 0;
    default:
      return 0;
  }
}

function sortedBucketValues(buckets: Map<string, DailyBucket>, metric: MetricName): number[] {
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, bucket]) => metricValue(bucket, metric));
}

function metricSeries(
  buckets: Map<string, DailyBucket>,
  metric: MetricName,
): { labels: string[]; values: number[] } {
  const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  return {
    labels: sorted.map(([label]) => label),
    values: sorted.map(([, bucket]) => metricValue(bucket, metric)),
  };
}

export function makePrismaDatasetFetcher(deps: PrismaDatasetFetcherDeps) {
  const { ecommerce, social } = deps;

  async function fetchOrders(projectId: string, start: Date, end: Date): Promise<OrderSummary[]> {
    const orders = await ecommerce.listOrders(projectId, 500, start);
    return orders.filter((o) => o.orderDate >= start && o.orderDate <= end).map((o) => ({
      orderDate: o.orderDate,
      total: o.total,
      couponCode: o.couponCode,
      attributedMediaId: o.attributedMediaId,
      attributionSource: o.attributionSource,
    }));
  }

  async function fetchMedia(projectId: string, limit = 100): Promise<MediaPost[]> {
    return deps.marketingInsights.listMediaPosts(projectId, { limit });
  }

  async function fetchAccountInsights(projectId: string, start: Date, end: Date): Promise<AccountInsight[]> {
    return prisma.accountInsight.findMany({
      where: { projectId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    }) as unknown as AccountInsight[];
  }

  async function fetchSinglePost(spec: AnalysisSpec, projectId: string): Promise<SinglePostDataset> {
    const media = await fetchMedia(projectId);
    const scored = media.map(toScoredPost);
    const targetId = spec.target?.postId;
    let targetIndex = -1;
    if (targetId) {
      targetIndex = media.findIndex((m) => m.id === targetId || m.externalId === targetId);
    }
    if (targetIndex === -1 && scored.length > 0) {
      targetIndex = 0;
    }
    const target = targetIndex >= 0 ? scored[targetIndex]! : emptyScoredPost();
    const baseline = scored.filter((_, i) => i !== targetIndex);
    return { target, baseline };
  }

  async function fetchTopN(spec: AnalysisSpec, projectId: string): Promise<TopNDataset> {
    const media = await fetchMedia(projectId);
    return { posts: media.map(toScoredPost) };
  }

  async function fetchBestTime(spec: AnalysisSpec, projectId: string): Promise<BestTimeDataset> {
    const [media, orders] = await Promise.all([
      fetchMedia(projectId),
      fetchOrders(projectId, new Date(0), new Date()),
    ]);
    return {
      media: media.map(toBestTimeMediaInput),
      orders: orders.map((o) => ({ orderDate: o.orderDate, total: o.total })),
    };
  }

  async function fetchComparePeriod(spec: AnalysisSpec, projectId: string): Promise<ComparePeriodDataset> {
    const currentRange = dateRange(spec.target?.dateRange, 7);
    const previousRange = dateRange(
      spec.target?.compareTo ?? {
        from: new Date(currentRange.start.getTime() - (currentRange.end.getTime() - currentRange.start.getTime())).toISOString(),
        to: currentRange.start.toISOString(),
      },
      7,
      -7,
    );

    const [currentOrders, previousOrders] = await Promise.all([
      fetchOrders(projectId, currentRange.start, currentRange.end),
      fetchOrders(projectId, previousRange.start, previousRange.end),
    ]);
    const [currentMedia, previousMedia] = await Promise.all([
      fetchMedia(projectId),
      fetchMedia(projectId),
    ]);
    const [currentInsights, previousInsights] = await Promise.all([
      fetchAccountInsights(projectId, currentRange.start, currentRange.end),
      fetchAccountInsights(projectId, previousRange.start, previousRange.end),
    ]);

    const metric: MetricName = spec.metrics[0] ?? "revenue";
    const current = buildDailyBuckets(currentRange.start, currentRange.end, currentOrders, currentMedia, currentInsights);
    const previous = buildDailyBuckets(previousRange.start, previousRange.end, previousOrders, previousMedia, previousInsights);

    return {
      current: sortedBucketValues(current, metric),
      previous: sortedBucketValues(previous, metric),
    };
  }

  async function fetchAnomalyCheck(spec: AnalysisSpec, projectId: string): Promise<AnomalyCheckDataset> {
    const range = dateRange(spec.target?.dateRange, 30);
    const [orders, media, insights] = await Promise.all([
      fetchOrders(projectId, range.start, range.end),
      fetchMedia(projectId),
      fetchAccountInsights(projectId, range.start, range.end),
    ]);
    const metric: MetricName = spec.metrics[0] ?? "revenue";
    const buckets = buildDailyBuckets(range.start, range.end, orders, media, insights);
    const threshold = typeof spec.filters?.threshold === "number" ? (spec.filters.threshold as number) : 2.5;
    return { values: sortedBucketValues(buckets, metric), threshold };
  }

  async function fetchCohortTrend(spec: AnalysisSpec, projectId: string): Promise<CohortTrendDataset> {
    const range = dateRange(spec.target?.dateRange, 30);
    const [orders, media, insights] = await Promise.all([
      fetchOrders(projectId, range.start, range.end),
      fetchMedia(projectId),
      fetchAccountInsights(projectId, range.start, range.end),
    ]);
    const metric: MetricName = spec.metrics[0] ?? "revenue";
    const buckets = buildDailyBuckets(range.start, range.end, orders, media, insights);
    const series = metricSeries(buckets, metric);
    return {
      points: series.labels.map((label, i) => ({ label, value: series.values[i]! })),
    };
  }

  async function fetchAttributionBreakdown(spec: AnalysisSpec, projectId: string): Promise<AttributionBreakdownDataset> {
    const range = dateRange(spec.target?.dateRange, 30);
    const [orders, media] = await Promise.all([
      fetchOrders(projectId, range.start, range.end),
      fetchMedia(projectId),
    ]);

    const mediaTypeById = new Map(media.map((m) => [m.id, m.mediaType]));
    const groupBy = (spec.target?.entityType as string) ?? (spec.groupBy as string) ?? "channel";

    const groups = new Map<string, { revenue: number; orders: number }>();

    for (const order of orders) {
      let key = "unknown";
      if (groupBy === "coupon") {
        key = order.couponCode ?? "no-coupon";
      } else if (groupBy === "media_type" && order.attributedMediaId) {
        key = mediaTypeById.get(order.attributedMediaId) ?? order.attributedMediaId;
      } else {
        key = order.attributionSource ?? "unknown";
      }
      const existing = groups.get(key) ?? { revenue: 0, orders: 0 };
      existing.revenue += order.total ?? 0;
      existing.orders += 1;
      groups.set(key, existing);
    }

    const records: AttributionRecord[] = Array.from(groups.entries()).map(([key, value]) => ({
      key,
      revenue: value.revenue,
      orders: value.orders,
    }));

    return { records };
  }

  async function fetchCorrelation(spec: AnalysisSpec, projectId: string): Promise<{ x: number[]; y: number[] }> {
    const range = dateRange(spec.target?.dateRange, 30);
    const [orders, media, insights] = await Promise.all([
      fetchOrders(projectId, range.start, range.end),
      fetchMedia(projectId),
      fetchAccountInsights(projectId, range.start, range.end),
    ]);
    const buckets = buildDailyBuckets(range.start, range.end, orders, media, insights);
    const xMetric: MetricName = spec.metrics[0] ?? "revenue";
    const yMetric: MetricName = spec.metrics[1] ?? "orders";
    const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
    return {
      x: sorted.map(([, bucket]) => metricValue(bucket, xMetric)),
      y: sorted.map(([, bucket]) => metricValue(bucket, yMetric)),
    };
  }

  async function fetchProfileQuality(spec: AnalysisSpec, projectId: string): Promise<ProfileQualityDataset> {
    const [media, insights, comments] = await Promise.all([
      fetchMedia(projectId),
      fetchAccountInsights(projectId, new Date(0), new Date()),
      social.listComments(projectId, 500).catch(() => []),
    ]);

    const latestInsight = insights.sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    return {
      profile: {
        followerCount: latestInsight?.followers ?? 0,
        mediaCount: media.length,
        bioLength: 0,
      },
      media: media.map((m) => ({
        likes: m.latestInsight?.likes ?? 0,
        comments: m.latestInsight?.comments ?? 0,
        captionLength: (m.caption ?? "").length,
        hashtags: m.hashtags,
        location: null,
      })),
      comments: comments.map((c) => ({ text: c.text })),
    };
  }

  const fetchers: Partial<Record<AnalysisOperation, (spec: AnalysisSpec, projectId: string) => Promise<unknown>>> = {
    single_post_analysis: fetchSinglePost,
    top_n: fetchTopN,
    best_time: fetchBestTime,
    compare_period: fetchComparePeriod,
    anomaly_check: fetchAnomalyCheck,
    cohort_trend: fetchCohortTrend,
    attribution_breakdown: fetchAttributionBreakdown,
    correlation: fetchCorrelation,
    profile_quality: fetchProfileQuality,
  };

  return async function fetchDataset(spec: AnalysisSpec, projectId: string): Promise<unknown> {
    const fetcher = fetchers[spec.operation];
    if (!fetcher) {
      throw new Error(`No dataset fetcher for operation ${spec.operation}`);
    }
    return fetcher(spec, projectId);
  };
}

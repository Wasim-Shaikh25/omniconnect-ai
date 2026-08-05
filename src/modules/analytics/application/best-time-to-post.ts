export interface BestTimeMediaInput {
  publishedAt: Date | null;
  metrics: {
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    saved?: number | null;
    plays?: number | null;
    videoViews?: number | null;
  };
}

export interface BestTimeOrderInput {
  orderDate: Date | null;
  total: number | null;
}

export interface BestTimeWindow {
  dayOfWeek: string;
  hour: number;
  label: string;
  engagementScore: number;
  revenueScore: number;
  compositeScore: number;
  postCount: number;
  orderCount: number;
}

export interface GetBestTimeToPostInput {
  media: BestTimeMediaInput[];
  orders: BestTimeOrderInput[];
  topN?: number;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function engagementScore(item: BestTimeMediaInput): number {
  const m = item.metrics ?? {};
  return (
    (m.likes ?? 0) +
    (m.comments ?? 0) * 2 +
    (m.shares ?? 0) * 3 +
    (m.saved ?? 0) * 2 +
    (m.plays ?? 0) * 0.1 +
    (m.videoViews ?? 0) * 0.1
  );
}

export function getBestTimeToPost(input: GetBestTimeToPostInput): BestTimeWindow[] {
  const buckets = new Map<string, { dayIndex: number; hour: number; engagement: number; posts: number; revenue: number; orders: number }>();

  for (const item of input.media) {
    if (!item.publishedAt) continue;
    const dayIndex = item.publishedAt.getUTCDay();
    const hour = item.publishedAt.getUTCHours();
    const key = `${dayIndex}-${hour}`;
    const existing = buckets.get(key);
    const score = engagementScore(item);
    if (existing) {
      existing.engagement += score;
      existing.posts += 1;
    } else {
      buckets.set(key, { dayIndex, hour, engagement: score, posts: 1, revenue: 0, orders: 0 });
    }
  }

  for (const order of input.orders) {
    if (!order.orderDate) continue;
    const dayIndex = order.orderDate.getUTCDay();
    const hour = order.orderDate.getUTCHours();
    const key = `${dayIndex}-${hour}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.revenue += order.total ?? 0;
      existing.orders += 1;
    } else {
      buckets.set(key, { dayIndex, hour, engagement: 0, posts: 0, revenue: order.total ?? 0, orders: 1 });
    }
  }

  const scored: BestTimeWindow[] = [];
  for (const [, b] of buckets.entries()) {
    const engagementScore = b.posts > 0 ? b.engagement / b.posts : 0;
    const revenueScore = b.orders > 0 ? b.revenue / b.orders : 0;
    const compositeScore = engagementScore + revenueScore;
    scored.push({
      dayOfWeek: DAYS[b.dayIndex] ?? "Unknown",
      hour: b.hour,
      label: `${DAYS[b.dayIndex]} ${String(b.hour).padStart(2, "0")}:00 UTC`,
      engagementScore,
      revenueScore,
      compositeScore,
      postCount: b.posts,
      orderCount: b.orders,
    });
  }

  const topN = input.topN ?? 5;
  return scored.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, topN);
}

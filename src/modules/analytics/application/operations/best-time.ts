import { getBestTimeToPost, type BestTimeWindow } from "../best-time-to-post";
import type { AnalysisResult } from "../../domain/analysis";

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

export interface BestTimeDataset {
  media: BestTimeMediaInput[];
  orders: BestTimeOrderInput[];
}

export interface BestTimeSpec {
  topN?: number;
}

export function bestTime(dataset: BestTimeDataset, spec: BestTimeSpec = {}): AnalysisResult {
  const windows = getBestTimeToPost({
    media: dataset.media,
    orders: dataset.orders,
    topN: spec.topN ?? 1,
  });

  const top = windows[0];
  if (!top) {
    return {
      operation: "best_time",
      values: {},
      evidence: ["No publish-time or order-time data available."],
      confidence: "low",
      dataQuality: "insufficient",
    };
  }

  return {
    operation: "best_time",
    values: {
      engagementScore: Math.round(top.engagementScore * 100) / 100,
      revenueScore: Math.round(top.revenueScore * 100) / 100,
      compositeScore: Math.round(top.compositeScore * 100) / 100,
      postCount: top.postCount,
      orderCount: top.orderCount,
      hour: top.hour,
    },
    evidence: [
      `Best posting window: ${top.label}`,
      `Window engagement score ${top.engagementScore.toFixed(2)}`,
      `Window revenue score ${top.revenueScore.toFixed(2)}`,
      `Composite score ${top.compositeScore.toFixed(2)}`,
      `Based on ${top.postCount} posts and ${top.orderCount} orders`,
    ],
    confidence:
      top.postCount >= 5 && top.orderCount >= 3 ? "high" : top.postCount >= 3 ? "medium" : "low",
    dataQuality: top.postCount >= 3 ? "live" : "insufficient",
  };
}

export function bestTimeLabel(window?: BestTimeWindow | null): string {
  return window?.label ?? "Weekday, 11:00 AM local time";
}

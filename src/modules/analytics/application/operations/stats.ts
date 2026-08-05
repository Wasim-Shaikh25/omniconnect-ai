export interface ScoredPost {
  id: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  plays: number;
  views: number;
  reach: number;
  impressions: number;
}

export function engagementScore(post: ScoredPost): number {
  return (
    (post.likes ?? 0) +
    (post.comments ?? 0) * 2 +
    (post.shares ?? 0) * 3 +
    (post.saves ?? 0) * 2 +
    (post.plays ?? 0) * 0.1 +
    (post.views ?? 0) * 0.1
  );
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function zScore(values: number[], value: number): number {
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 0;
  return (value - m) / s;
}

export function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 50;
  let lower = 0;
  let same = 0;
  for (const v of values) {
    if (v < value) lower += 1;
    else if (v === value) same += 1;
  }
  return Math.round(((lower + same / 2) / values.length) * 100);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function topN<T>(items: T[], score: (item: T) => number, limit: number): T[] {
  return items
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

export function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  const num = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i]! - my), 0);
  const denX = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0));
  const denY = Math.sqrt(ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
}

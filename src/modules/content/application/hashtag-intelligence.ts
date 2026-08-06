import { z } from "zod";
import type { MetaMediaItem } from "@/modules/meta";

export interface HashtagMediaMetrics {
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  avgPlays: number;
  postCount: number;
}

export interface HashtagAnalysis {
  tag: string;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  engagementScore: number;
  reachEstimate: number;
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  relevanceScore: number;
  recommendation: string;
  evidence: string;
}

export interface HashtagIntelligenceInput {
  projectId: string;
  query: string;
}

export interface HashtagScorerInput {
  tag: string;
  metrics: HashtagMediaMetrics;
  query: string;
}

export type HashtagScorer = (input: HashtagScorerInput) => Promise<Partial<HashtagAnalysis>>;

export interface MakeHashtagIntelligenceDeps {
  searchHashtag(
    projectId: string,
    query: string,
  ): Promise<{ hashtagId: string | null; userId: string | null }>;
  getHashtagMedia(
    projectId: string,
    hashtagId: string,
    options?: { top?: boolean; recent?: boolean; limit?: number },
  ): Promise<MetaMediaItem[]>;
  scoreHashtags?: HashtagScorer;
}

const queryHashtagSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1).max(120),
});

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeMetrics(items: MetaMediaItem[]): HashtagMediaMetrics {
  return {
    avgLikes: average(items.map((m) => m.metrics?.likes ?? 0)),
    avgComments: average(items.map((m) => m.metrics?.comments ?? 0)),
    avgShares: average(items.map((m) => m.metrics?.shares ?? 0)),
    avgSaves: average(items.map((m) => m.metrics?.saved ?? 0)),
    avgPlays: average(items.map((m) => m.metrics?.plays ?? 0)),
    postCount: items.length,
  };
}

function topRelatedTags(items: MetaMediaItem[], exclude: string, limit: number): { tag: string; items: MetaMediaItem[] }[] {
  const counts = new Map<string, MetaMediaItem[]>();
  const lowerExclude = exclude.toLowerCase();
  for (const item of items) {
    if (!item.caption) continue;
    const matches = item.caption.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi) ?? [];
    for (const raw of matches) {
      const tag = raw.slice(1).toLowerCase();
      if (tag === lowerExclude || tag.length === 0) continue;
      const list = counts.get(tag) ?? [];
      list.push(item);
      counts.set(tag, list);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([tag, related]) => ({ tag, items: related }));
}

function reachEstimate(metrics: HashtagMediaMetrics): number {
  const base = metrics.avgLikes + metrics.avgComments * 2;
  return Math.round(base * 100);
}

function competitionLevel(metrics: HashtagMediaMetrics): "LOW" | "MEDIUM" | "HIGH" {
  const score = metrics.avgLikes + metrics.avgComments * 2 + metrics.avgSaves + metrics.avgShares * 3;
  if (score > 2000) return "HIGH";
  if (score > 200) return "MEDIUM";
  return "LOW";
}

function relevanceForTag(tag: string, query: string, relatedCount: number, total: number): number {
  const lowerTag = tag.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let score = 0;
  if (lowerTag === lowerQuery) score += 100;
  if (lowerTag.includes(lowerQuery)) score += 40;
  if (lowerQuery.includes(lowerTag)) score += 20;
  score += Math.min(relatedCount * 10, 50);
  score += total > 0 ? Math.min((relatedCount / total) * 100, 40) : 0;
  return Math.min(Math.round(score), 100);
}

function defaultAnalysis(tag: string, query: string, metrics: HashtagMediaMetrics, relevance: number): HashtagAnalysis {
  const reach = reachEstimate(metrics);
  const competition = competitionLevel(metrics);
  const engagement = Math.round(
    (metrics.avgLikes + metrics.avgComments * 2 + metrics.avgShares * 3 + metrics.avgSaves * 2) * 100,
  ) / 100;

  let recommendation: string;
  if (competition === "LOW" && reach >= 1000) {
    recommendation = `Low competition with solid estimated reach — a strong hashtag to include now.`;
  } else if (competition === "HIGH" && reach >= 10000) {
    recommendation = `High reach and high competition — mix with niche tags to stand out.`;
  } else if (reach < 500) {
    recommendation = `Small estimated reach; use as a niche tag rather than a primary one.`;
  } else {
    recommendation = `Moderate metrics; good supporting tag for a balanced hashtag set.`;
  }

  return {
    tag,
    postCount: metrics.postCount,
    avgLikes: Math.round(metrics.avgLikes * 100) / 100,
    avgComments: Math.round(metrics.avgComments * 100) / 100,
    engagementScore: engagement,
    reachEstimate: reach,
    competitionLevel: competition,
    relevanceScore: relevance,
    recommendation,
    evidence: `${metrics.postCount} top posts, avg ${metrics.avgLikes.toFixed(0)} likes / ${metrics.avgComments.toFixed(0)} comments, reach est. ${reach.toLocaleString()}.`,
  };
}

export function makeHashtagIntelligence(deps: MakeHashtagIntelligenceDeps) {
  async function analyzeTag(
    tag: string,
    query: string,
    items: MetaMediaItem[],
    relevance: number,
  ): Promise<HashtagAnalysis> {
    const metrics = computeMetrics(items);
    const base = defaultAnalysis(tag, query, metrics, relevance);
    if (!deps.scoreHashtags) return base;

    try {
      const ai = await deps.scoreHashtags({ tag, query, metrics });
      return {
        ...base,
        ...ai,
        tag,
        postCount: ai.postCount ?? base.postCount,
        avgLikes: ai.avgLikes ?? base.avgLikes,
        avgComments: ai.avgComments ?? base.avgComments,
        engagementScore: ai.engagementScore ?? base.engagementScore,
        reachEstimate: ai.reachEstimate ?? base.reachEstimate,
        competitionLevel: ai.competitionLevel ?? base.competitionLevel,
        relevanceScore: ai.relevanceScore ?? base.relevanceScore,
        recommendation: ai.recommendation ?? base.recommendation,
        evidence: ai.evidence ?? base.evidence,
      };
    } catch {
      return base;
    }
  }

  return async function hashtagIntelligence(input: HashtagIntelligenceInput): Promise<HashtagAnalysis[]> {
    const parsed = queryHashtagSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid hashtag query");
    }
    const { projectId, query } = parsed.data;

    const { hashtagId } = await deps.searchHashtag(projectId, query);
    if (!hashtagId) {
      return [];
    }

    const items = await deps.getHashtagMedia(projectId, hashtagId, { top: true, limit: 10 });
    if (items.length === 0) {
      return [];
    }

    const related = topRelatedTags(items, query, 5);
    const total = items.length;

    const results: HashtagAnalysis[] = [
      await analyzeTag(query, query, items, relevanceForTag(query, query, total, total)),
    ];

    for (const group of related) {
      results.push(
        await analyzeTag(group.tag, query, group.items, relevanceForTag(group.tag, query, group.items.length, total)),
      );
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore || b.reachEstimate - a.reachEstimate);
  };
}

export type HashtagIntelligence = ReturnType<typeof makeHashtagIntelligence>;

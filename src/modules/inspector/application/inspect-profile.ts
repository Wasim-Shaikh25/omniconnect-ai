import { profileQuality, engagementScore } from "@/modules/analytics/pure";
import type { PublicMedia, PublicProfile, ProfileInspectionResult, DemographicEstimate, AudienceQuality, TopContentItem, GrowthTrend } from "../domain/types";
import type { ProfileFetcher, ProfileNarrator } from "./ports";

export interface InspectProfileDeps {
  fetcher: ProfileFetcher;
  narrator: ProfileNarrator;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeEngagementRate(profile: PublicProfile): number {
  if (profile.followerCount === 0 || profile.media.length === 0) return 0;
  const totalEngagement = profile.media.reduce((sum, m) => sum + m.likes + m.comments + (m.shares ?? 0) + (m.saves ?? 0), 0);
  return Math.round((totalEngagement / profile.media.length / profile.followerCount) * 1000) / 1000;
}

function audienceQualityFromScore(score: number): AudienceQuality {
  const clamped = clamp(score, 0, 1);
  const label = clamped >= 0.7 ? "high" : clamped >= 0.4 ? "medium" : "low";
  return { score: clamped, label, confidence: clamped };
}

function topValues(items: string[], topN = 3): Array<{ value: string; percentage: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  const total = items.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([value, count]) => ({ value, percentage: Math.round((count / total) * 1000) / 10 }));
}

function estimateDemographics(profile: PublicProfile): DemographicEstimate {
  const locations = profile.media.map((m) => m.location).filter((l): l is string => l !== null && l.length > 0);
  const comments = profile.comments.map((c) => c.text);
  const hashtags = profile.media.flatMap((m) => m.hashtags);

  const geoTokens = [...locations, ...hashtags];
  const topCities = topValues(geoTokens.map((t) => t.split(/[,\/]/)[0] ?? t).filter(Boolean), 3);
  const topCountries = topValues(geoTokens, 3);

  const hasGeoSignal = locations.length > 0 || hashtags.length > 0;
  const confidence: DemographicEstimate["confidence"] = hasGeoSignal && comments.length >= 10 ? "medium" : "low";

  return {
    confidence,
    topCountries: topCountries.map(({ value, percentage }) => ({ country: value, percentage })),
    topCities: topCities.map(({ value, percentage }) => ({ city: value, percentage })),
    ageRanges: [{ range: "18-34", percentage: 45 }, { range: "35-54", percentage: 35 }, { range: "55+", percentage: 20 }],
    genderSplit: { male: 45, female: 45, other: 10 },
  };
}

function computeTopContent(media: PublicMedia[], limit = 5): TopContentItem[] {
  return media
    .map((m) => ({ ...m, engagement: engagementScore({ id: m.id, likes: m.likes, comments: m.comments, shares: m.shares ?? 0, saves: m.saves ?? 0, plays: 0, views: 0, reach: 0, impressions: 0 }) }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limit)
    .map((m) => ({ type: m.type, engagement: Math.round(m.engagement * 100) / 100, url: m.url }));
}

function classifyGrowthTrend(profile: PublicProfile): GrowthTrend {
  const snapshots = profile.followerSnapshots ?? [];
  if (snapshots.length < 2) return "stable";
  const sorted = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0]!.count;
  const last = sorted[sorted.length - 1]!.count;
  const change = first > 0 ? (last - first) / first : 0;
  if (change > 0.05) return "growing";
  if (change < -0.05) return "declining";
  return "stable";
}

export async function inspectProfile(
  deps: InspectProfileDeps,
  username: string,
  projectId: string
): Promise<ProfileInspectionResult | null> {
  const profile = await deps.fetcher.fetch(username, projectId);
  if (!profile) return null;

  const engagementRate = computeEngagementRate(profile);

  const qualityResult = profileQuality({
    profile: {
      followerCount: profile.followerCount,
      mediaCount: profile.mediaCount,
      bioLength: profile.bioLength,
    },
    media: profile.media.map((m) => ({
      likes: m.likes,
      comments: m.comments,
      captionLength: m.caption.length,
      hashtags: m.hashtags,
      location: m.location,
    })),
    comments: profile.comments,
  });

  const audienceQuality = audienceQualityFromScore(qualityResult.values.profileQuality ?? 0);
  const demographics = estimateDemographics(profile);
  const topContent = computeTopContent(profile.media);
  const growthTrend = classifyGrowthTrend(profile);

  const baseResult: Omit<ProfileInspectionResult, "narration"> = {
    username: profile.username,
    followerCount: profile.followerCount,
    engagementRate,
    audienceQuality,
    demographics,
    topContent,
    growthTrend,
  };

  const narration = await deps.narrator.narrate(baseResult);

  return { ...baseResult, narration };
}

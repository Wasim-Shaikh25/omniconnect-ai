import { mean, stdDev } from "./stats";
import type { AnalysisResult } from "../../domain/analysis";

export interface ProfileQualityProfile {
  followerCount: number;
  mediaCount: number;
  bioLength: number;
}

export interface ProfileQualityMedia {
  likes: number;
  comments: number;
  captionLength: number;
  hashtags: string[];
  location: string | null;
}

export interface ProfileQualityComment {
  text: string;
}

export interface ProfileQualityDataset {
  profile: ProfileQualityProfile;
  media: ProfileQualityMedia[];
  comments: ProfileQualityComment[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueCount<T>(items: T[]): number {
  return new Set(items).size;
}

function shannonEntropy(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / tokens.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return value >= min ? 1 : 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export function profileQuality(dataset: ProfileQualityDataset): AnalysisResult {
  const { profile, media, comments } = dataset;

  if (media.length === 0 || profile.followerCount <= 0) {
    return {
      operation: "profile_quality",
      values: {
        profileQuality: 0,
        engagementRate: 0,
        authenticityScore: 0,
        contentDiversity: 0,
        spamRisk: 0,
        geoDiversity: 0,
        followerToMediaRatio: 0,
        captionConsistency: 0,
      },
      evidence: ["Insufficient public profile data to compute quality signals."],
      confidence: "low",
      dataQuality: "insufficient",
    };
  }

  const engagementRates = media.map((m) =>
    profile.followerCount > 0 ? (m.likes + m.comments) / profile.followerCount : 0
  );
  const engagementRate = mean(engagementRates);
  const engagementStdDev = stdDev(engagementRates);
  const engagementCoefficient = engagementRate > 0 ? engagementStdDev / engagementRate : 0;

  const allHashtags = media.flatMap((m) => m.hashtags);
  const uniqueHashtags = uniqueCount(allHashtags);
  const contentDiversity = allHashtags.length > 0 ? uniqueHashtags / allHashtags.length : 1;

  const locations = media.map((m) => m.location).filter((l): l is string => l !== null);
  const geoDiversity = locations.length > 0 ? uniqueCount(locations) / locations.length : 0;

  const captionLengths = media.map((m) => m.captionLength);
  const captionMean = mean(captionLengths);
  const captionStd = stdDev(captionLengths);
  const captionConsistency = captionMean > 0 ? clamp(1 - captionStd / captionMean, 0, 1) : 0;

  const followerToMediaRatio = profile.followerCount / Math.max(1, profile.mediaCount);

  // Spam risk signals
  const excessiveHashtags = media.filter((m) => m.hashtags.length > 30).length;
  const hashtagSpam = excessiveHashtags / media.length;

  const commentTexts = comments.map((c) => c.text.toLowerCase().trim());
  const uniqueComments = uniqueCount(commentTexts);
  const repeatedCommentRatio = comments.length > 0 ? 1 - uniqueComments / comments.length : 0;

  // Suspicious engagement: very low comment-to-like ratio on every post
  const lowCommentRatios = media.filter((m) => m.likes > 0 && m.comments / m.likes < 0.001).length;
  const engagementSpam = lowCommentRatios / media.length;

  const spamRisk = clamp((hashtagSpam * 0.4 + repeatedCommentRatio * 0.4 + engagementSpam * 0.2), 0, 1);

  // Authenticity: engagement consistency + content diversity + geo diversity + caption consistency
  const authenticityScore = clamp(
    (1 - engagementCoefficient) * 0.25 +
      contentDiversity * 0.25 +
      geoDiversity * 0.2 +
      captionConsistency * 0.2 +
      (1 - spamRisk) * 0.1,
    0,
    1
  );

  // Follower quality: very low or very high follower/media ratios are suspicious.
  // A healthy account tends to fall between ~50 and ~500 followers per media item.
  const followerQuality = clamp(
    1 - Math.abs(normalize(followerToMediaRatio, 50, 500) - 0.5) * 2,
    0,
    1
  );

  const engagementComponent = clamp(engagementRate * 100, 0, 1);

  const profileQuality = clamp(
    authenticityScore * 0.5 +
      followerQuality * 0.25 +
      engagementComponent * 0.15 +
      (1 - spamRisk) * 0.1,
    0,
    1
  );

  const commentEntropy = shannonEntropy(commentTexts);

  return {
    operation: "profile_quality",
    values: {
      profileQuality: Math.round(profileQuality * 1000) / 1000,
      engagementRate: Math.round(engagementRate * 1000) / 1000,
      authenticityScore: Math.round(authenticityScore * 1000) / 1000,
      contentDiversity: Math.round(contentDiversity * 1000) / 1000,
      spamRisk: Math.round(spamRisk * 1000) / 1000,
      geoDiversity: Math.round(geoDiversity * 1000) / 1000,
      followerToMediaRatio: Math.round(followerToMediaRatio * 100) / 100,
      captionConsistency: Math.round(captionConsistency * 1000) / 1000,
      engagementCoefficient: Math.round(engagementCoefficient * 1000) / 1000,
      commentEntropy: Math.round(commentEntropy * 1000) / 1000,
      bioLength: profile.bioLength,
      mediaCount: profile.mediaCount,
      followerCount: profile.followerCount,
    },
    evidence: [
      `Followers ${profile.followerCount} across ${profile.mediaCount} media (${followerToMediaRatio.toFixed(1)} followers/media)`,
      `Average engagement rate ${(engagementRate * 100).toFixed(2)}%`,
      `Content diversity (unique hashtags ratio) ${(contentDiversity * 100).toFixed(1)}%`,
      `Geo diversity ${(geoDiversity * 100).toFixed(1)}%`,
      `Caption consistency ${(captionConsistency * 100).toFixed(1)}%`,
      `Spam risk ${(spamRisk * 100).toFixed(1)}%`,
      `Authenticity score ${(authenticityScore * 100).toFixed(1)}%`,
      `Profile quality score ${(profileQuality * 100).toFixed(1)}%`,
    ],
    confidence:
      media.length >= 20 && comments.length >= 20 ? "high" : media.length >= 5 ? "medium" : "low",
    dataQuality: media.length >= 5 && profile.followerCount > 0 ? "live" : "insufficient",
  };
}

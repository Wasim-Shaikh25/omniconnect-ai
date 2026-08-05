export interface PublicMedia {
  id: string;
  type: "reel" | "carousel" | "photo" | "video";
  caption: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  url: string;
  location: string | null;
  hashtags: string[];
}

export interface PublicComment {
  text: string;
}

export interface PublicProfile {
  username: string;
  followerCount: number;
  mediaCount: number;
  bioLength: number;
  media: PublicMedia[];
  comments: PublicComment[];
  followerSnapshots?: Array<{ date: string; count: number }>;
}

export interface DemographicEstimate {
  confidence: "high" | "medium" | "low";
  topCountries: Array<{ country: string; percentage: number }>;
  topCities: Array<{ city: string; percentage: number }>;
  ageRanges: Array<{ range: string; percentage: number }>;
  genderSplit: { male: number; female: number; other: number };
}

export interface AudienceQuality {
  score: number;
  label: "high" | "medium" | "low";
  confidence: number;
}

export interface TopContentItem {
  type: "reel" | "carousel" | "photo" | "video";
  engagement: number;
  url: string;
}

export type GrowthTrend = "growing" | "stable" | "declining";

export interface ProfileInspectionResult {
  username: string;
  followerCount: number;
  engagementRate: number;
  audienceQuality: AudienceQuality;
  demographics: DemographicEstimate;
  topContent: TopContentItem[];
  growthTrend: GrowthTrend;
  narration: string;
}

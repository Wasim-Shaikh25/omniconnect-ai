export interface ContentPerformanceSection {
  totalPosts: number;
  published: number;
  draft: number;
  failed: number;
  byType: Record<string, number>;
  why: string;
  nextRecommendation: string;
  topPosts: {
    id: string;
    caption: string;
    mediaType: string | null;
    likes: number;
    comments: number;
    shares: number;
    plays: number;
    reach: number;
    impressions: number;
    saved: number;
    engagement: number;
    orders: number;
    revenue: number;
  }[];
}

export interface AudienceDemographics {
  genderAge: Record<string, number>;
  cities: Record<string, number>;
  countries: Record<string, number>;
  locales: Record<string, number>;
}

export interface AudienceInsights {
  username: string | null;
  followers: number | null;
  mediaCount: number | null;
  impressions: number | null;
  reach: number | null;
  profileViews: number | null;
  biography: string | null;
  profilePictureUrl: string | null;
}

export interface AudienceSection {
  followers: number;
  newFollowersThisWeek: number;
  customers: number;
  conversations: number;
  messages: number;
  why: string;
  nextRecommendation: string;
  segments: { label: string; count: number }[];
  pageInsights: AudienceInsights | null;
  demographics: AudienceDemographics | null;
}

export interface ProductPerformanceSection {
  totalProducts: number;
  orders: number;
  revenue: number;
  currency: string | null;
  aov: number | null;
  newCustomersFromMeta: number;
  topProductByRevenue: { title: string; revenue: number } | null;
  why: string;
  nextRecommendation: string;
  topProducts: { title: string; revenue: number }[];
}

export interface CampaignSection {
  activeCampaigns: number;
  couponsGenerated: number;
  couponsUsed: number;
  couponConversionRate: number | null;
  couponRevenue: number;
  why: string;
  nextRecommendation: string;
  topCampaigns: { name: string; couponsGenerated: number; couponsUsed: number; revenue: number }[];
}

export interface MarketingPerformanceView {
  userId: string;
  projectId: string;
  generatedAt: Date;
  dataQuality: "live" | "partial" | "simulated";
  content: ContentPerformanceSection;
  audience: AudienceSection;
  product: ProductPerformanceSection;
  campaign: CampaignSection;
  summary: string;
  explanation: string;
}

export interface MediaPost {
  id: string;
  projectId: string;
  trackedAccountId: string | null;
  externalId: string;
  platform: string;
  mediaType: "POST" | "REEL" | "STORY" | "LIVE" | "CAROUSEL";
  permalink: string | null;
  caption: string | null;
  hashtags: string[];
  audioId: string | null;
  audioName: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  latestInsight?: MediaInsight | null;
}

export interface MediaInsight {
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
  engagementRate: number | null;
  storyExits: number | null;
  storyRepliesCount: number | null;
  storyTapsForward: number | null;
  storyTapsBack: number | null;
  fetchedAt: Date;
}

export interface AccountInsight {
  id: string;
  projectId: string;
  date: Date;
  followers: number | null;
  profileViews: number | null;
  reach: number | null;
  impressions: number | null;
  websiteClicks: number | null;
  biography: string | null;
  profilePictureUrl: string | null;
  audienceJson: Record<string, unknown> | null;
  fetchedAt: Date;
}

export interface TrendSnapshot {
  id: string;
  projectId: string;
  type: "HASHTAG" | "AUDIO" | "NICHE";
  query: string;
  data: Record<string, unknown>;
  fetchedAt: Date;
}

export interface ContentRecommendation {
  id: string;
  projectId: string;
  type: string;
  title: string;
  outline: string;
  hashtags: string[];
  audioSuggestion: string | null;
  generatedAt: Date;
  basedOnMediaIds: string[];
}

export interface Report {
  id: string;
  projectId: string;
  period: "WEEKLY" | "MONTHLY";
  content: Record<string, unknown>;
  generatedAt: Date;
}

export interface MediaAnalysis {
  mediaPostId: string;
  whyItWorked: string;
  slideBySlideStoryboard: { slide: number; visual: string; caption: string }[];
  suggestedImprovements: string[];
  generatedAt: Date;
}

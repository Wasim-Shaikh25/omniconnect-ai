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
  topProductByRevenue: { title: string; revenue: number } | null;
  why: string;
  nextRecommendation: string;
  topProducts: { title: string; revenue: number }[];
}

export interface CampaignSection {
  activeCampaigns: number;
  couponsGenerated: number;
  couponsUsed: number;
  why: string;
  nextRecommendation: string;
  topCampaigns: { name: string; couponsGenerated: number; couponsUsed: number }[];
}

export interface MarketingPerformanceView {
  organizationId: string;
  storeId: string;
  generatedAt: Date;
  dataQuality: "live" | "partial" | "simulated";
  content: ContentPerformanceSection;
  audience: AudienceSection;
  product: ProductPerformanceSection;
  campaign: CampaignSection;
  summary: string;
  explanation: string;
}

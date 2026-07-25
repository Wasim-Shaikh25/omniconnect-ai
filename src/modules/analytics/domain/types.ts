export interface ContentPerformanceSection {
  totalPosts: number;
  published: number;
  draft: number;
  failed: number;
  byType: Record<string, number>;
  why: string;
  nextRecommendation: string;
  topPosts: { caption: string; mediaType: string | null; likes: number; comments: number }[];
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
  content: ContentPerformanceSection;
  audience: AudienceSection;
  product: ProductPerformanceSection;
  campaign: CampaignSection;
  summary: string;
  explanation: string;
}

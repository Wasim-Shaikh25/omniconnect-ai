export interface ContentPerformanceSection {
  totalPosts: number;
  published: number;
  draft: number;
  failed: number;
  byType: Record<string, number>;
}

export interface AudienceSection {
  followers: number;
  newFollowersThisWeek: number;
  customers: number;
  conversations: number;
  messages: number;
}

export interface ProductPerformanceSection {
  totalProducts: number;
  orders: number;
  revenue: number;
  currency: string | null;
  topProductByRevenue: { title: string; revenue: number } | null;
}

export interface CampaignSection {
  activeCampaigns: number;
  couponsGenerated: number;
  couponsUsed: number;
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
}

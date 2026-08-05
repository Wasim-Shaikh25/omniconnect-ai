export interface UgcAssetRecord {
  id: string;
  projectId: string;
  socialMentionId: string | null;
  customerId: string | null;
  creatorHandle: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  source: string;
  caption: string | null;
  rightsStatus: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AmbassadorRecord {
  id: string;
  projectId: string;
  customerId: string | null;
  code: string;
  discountPct: number;
  commissionPct: number;
  status: string;
  totalReferrals: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralOrderRecord {
  id: string;
  projectId: string;
  ambassadorId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DmCampaignRecord {
  id: string;
  projectId: string;
  campaignType: string;
  audienceCriteria: unknown;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  metrics: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackInStockSubscriptionRecord {
  id: string;
  projectId: string;
  productId: string;
  externalUserId: string | null;
  customerId: string | null;
  notifiedAt: Date | null;
  createdAt: Date;
}

export interface UgcRepository {
  create(input: {
    projectId: string;
    socialMentionId?: string | null;
    customerId?: string | null;
    creatorHandle?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    source: string;
    caption?: string | null;
  }): Promise<UgcAssetRecord>;
  listByStore(projectId: string, limit?: number): Promise<UgcAssetRecord[]>;
  updateRights(id: string, projectId: string, status: string, approvedBy?: string | null): Promise<UgcAssetRecord>;
}

export interface AmbassadorRepository {
  create(input: {
    projectId: string;
    customerId?: string | null;
    code: string;
    discountPct?: number;
    commissionPct?: number;
    status?: string;
  }): Promise<AmbassadorRecord>;
  listByStore(projectId: string, limit?: number): Promise<AmbassadorRecord[]>;
  findById(id: string, projectId: string): Promise<AmbassadorRecord | null>;
  incrementEarnings(id: string, projectId: string, amount: number, referrals: number): Promise<AmbassadorRecord>;
}

export interface ReferralOrderRepository {
  create(input: {
    projectId: string;
    ambassadorId: string;
    orderId: string;
    orderAmount: number;
    commissionAmount: number;
    status?: string;
  }): Promise<ReferralOrderRecord>;
  listByStore(projectId: string, limit?: number): Promise<ReferralOrderRecord[]>;
}

export interface DmCampaignRepository {
  create(input: {
    projectId: string;
    campaignType: string;
    audienceCriteria?: unknown;
    status?: string;
    scheduledAt?: Date | null;
  }): Promise<DmCampaignRecord>;
  listByStore(projectId: string, limit?: number): Promise<DmCampaignRecord[]>;
  markSent(id: string, projectId: string, metrics?: unknown): Promise<DmCampaignRecord>;
}

export interface BackInStockRepository {
  create(input: {
    projectId: string;
    productId: string;
    externalUserId?: string | null;
    customerId?: string | null;
  }): Promise<BackInStockSubscriptionRecord>;
  listByStore(projectId: string, limit?: number): Promise<BackInStockSubscriptionRecord[]>;
  markNotified(id: string, projectId: string): Promise<BackInStockSubscriptionRecord>;
}

export interface CommentUnlockCampaignRecord {
  id: string;
  projectId: string;
  keyword: string;
  rewardType: "LINK" | "COUPON" | "MESSAGE";
  rewardValue: string | null;
  message: string;
  referralAsk: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentUnlockRedemptionRecord {
  id: string;
  campaignId: string;
  projectId: string;
  externalUserId: string;
  username: string | null;
  commentId: string | null;
  status: "PENDING" | "SENT" | "REFERRED";
  createdAt: Date;
  sentAt: Date | null;
}

export interface CommentUnlockRepository {
  createCampaign(input: {
    projectId: string;
    keyword: string;
    rewardType: "LINK" | "COUPON" | "MESSAGE";
    rewardValue?: string | null;
    message: string;
    referralAsk?: string | null;
  }): Promise<CommentUnlockCampaignRecord>;
  listCampaignsByStore(projectId: string, limit?: number): Promise<CommentUnlockCampaignRecord[]>;
  findActiveCampaignByKeyword(projectId: string, keyword: string): Promise<CommentUnlockCampaignRecord | null>;
  createRedemption(input: {
    campaignId: string;
    projectId: string;
    externalUserId: string;
    username?: string | null;
    commentId?: string | null;
  }): Promise<CommentUnlockRedemptionRecord>;
  listRedemptionsByCampaign(campaignId: string, limit?: number): Promise<CommentUnlockRedemptionRecord[]>;
  markSent(id: string, projectId: string): Promise<CommentUnlockRedemptionRecord>;
  markReferred(id: string, projectId: string): Promise<CommentUnlockRedemptionRecord>;
  findExistingRedemption(campaignId: string, externalUserId: string): Promise<CommentUnlockRedemptionRecord | null>;
}

export interface GrowthQueries {
  listUgc(projectId: string, limit?: number): Promise<UgcAssetRecord[]>;
  listAmbassadors(projectId: string, limit?: number): Promise<AmbassadorRecord[]>;
  listReferrals(projectId: string, limit?: number): Promise<ReferralOrderRecord[]>;
  listCampaigns(projectId: string, limit?: number): Promise<DmCampaignRecord[]>;
  listBackInStock(projectId: string, limit?: number): Promise<BackInStockSubscriptionRecord[]>;
  listCommentUnlockCampaigns(projectId: string): Promise<CommentUnlockCampaignRecord[]>;
}

export interface GrowthService {
  collectUgc(input: {
    projectId: string;
    creatorHandle?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    source: string;
    caption?: string | null;
  }): Promise<UgcAssetRecord>;
  requestRights(id: string, projectId: string): Promise<UgcAssetRecord>;
  approveRights(id: string, projectId: string, approvedBy: string): Promise<UgcAssetRecord>;
  enrollAmbassador(input: {
    projectId: string;
    customerId?: string | null;
    handle?: string | null;
    discountPct?: number;
    commissionPct?: number;
  }): Promise<AmbassadorRecord>;
  recordReferral(input: {
    projectId: string;
    ambassadorId: string;
    orderId: string;
    orderAmount: number;
  }): Promise<ReferralOrderRecord>;
  createDmCampaign(input: {
    projectId: string;
    campaignType: string;
    audienceCriteria?: unknown;
    scheduledAt?: Date | null;
  }): Promise<DmCampaignRecord>;
  sendDmCampaign(id: string, projectId: string): Promise<DmCampaignRecord>;
  subscribeBackInStock(input: {
    projectId: string;
    productId: string;
    externalUserId?: string | null;
    customerId?: string | null;
  }): Promise<BackInStockSubscriptionRecord>;
  notifyBackInStock(id: string, projectId: string): Promise<BackInStockSubscriptionRecord>;
  createCommentUnlockCampaign(input: {
    projectId: string;
    keyword: string;
    rewardType: "LINK" | "COUPON" | "MESSAGE";
    rewardValue?: string | null;
    message: string;
    referralAsk?: string | null;
  }): Promise<CommentUnlockCampaignRecord>;
  processCommentUnlock(input: {
    projectId: string;
    externalUserId: string;
    username: string | null;
    commentId: string | null;
    text: string;
    channel: "INSTAGRAM" | "FACEBOOK";
  }): Promise<{ sent: boolean; campaignId?: string }>;
}

export interface UgcAssetRecord {
  id: string;
  storeId: string;
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
  storeId: string;
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
  storeId: string;
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
  storeId: string;
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
  storeId: string;
  productId: string;
  externalUserId: string | null;
  customerId: string | null;
  notifiedAt: Date | null;
  createdAt: Date;
}

export interface UgcRepository {
  create(input: {
    storeId: string;
    socialMentionId?: string | null;
    customerId?: string | null;
    creatorHandle?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    source: string;
    caption?: string | null;
  }): Promise<UgcAssetRecord>;
  listByStore(storeId: string, limit?: number): Promise<UgcAssetRecord[]>;
  updateRights(id: string, status: string, approvedBy?: string | null): Promise<UgcAssetRecord>;
}

export interface AmbassadorRepository {
  create(input: {
    storeId: string;
    customerId?: string | null;
    code: string;
    discountPct?: number;
    commissionPct?: number;
    status?: string;
  }): Promise<AmbassadorRecord>;
  listByStore(storeId: string, limit?: number): Promise<AmbassadorRecord[]>;
  findById(id: string): Promise<AmbassadorRecord | null>;
  incrementEarnings(id: string, amount: number, referrals: number): Promise<AmbassadorRecord>;
}

export interface ReferralOrderRepository {
  create(input: {
    storeId: string;
    ambassadorId: string;
    orderId: string;
    orderAmount: number;
    commissionAmount: number;
    status?: string;
  }): Promise<ReferralOrderRecord>;
  listByStore(storeId: string, limit?: number): Promise<ReferralOrderRecord[]>;
}

export interface DmCampaignRepository {
  create(input: {
    storeId: string;
    campaignType: string;
    audienceCriteria?: unknown;
    status?: string;
    scheduledAt?: Date | null;
  }): Promise<DmCampaignRecord>;
  listByStore(storeId: string, limit?: number): Promise<DmCampaignRecord[]>;
  markSent(id: string, metrics?: unknown): Promise<DmCampaignRecord>;
}

export interface BackInStockRepository {
  create(input: {
    storeId: string;
    productId: string;
    externalUserId?: string | null;
    customerId?: string | null;
  }): Promise<BackInStockSubscriptionRecord>;
  listByStore(storeId: string, limit?: number): Promise<BackInStockSubscriptionRecord[]>;
  markNotified(id: string): Promise<BackInStockSubscriptionRecord>;
}

export interface CommentUnlockCampaignRecord {
  id: string;
  storeId: string;
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
  storeId: string;
  externalUserId: string;
  username: string | null;
  commentId: string | null;
  status: "PENDING" | "SENT" | "REFERRED";
  createdAt: Date;
  sentAt: Date | null;
}

export interface CommentUnlockRepository {
  createCampaign(input: {
    storeId: string;
    keyword: string;
    rewardType: "LINK" | "COUPON" | "MESSAGE";
    rewardValue?: string | null;
    message: string;
    referralAsk?: string | null;
  }): Promise<CommentUnlockCampaignRecord>;
  listCampaignsByStore(storeId: string): Promise<CommentUnlockCampaignRecord[]>;
  findActiveCampaignByKeyword(storeId: string, keyword: string): Promise<CommentUnlockCampaignRecord | null>;
  createRedemption(input: {
    campaignId: string;
    storeId: string;
    externalUserId: string;
    username?: string | null;
    commentId?: string | null;
  }): Promise<CommentUnlockRedemptionRecord>;
  listRedemptionsByCampaign(campaignId: string): Promise<CommentUnlockRedemptionRecord[]>;
  markSent(id: string): Promise<CommentUnlockRedemptionRecord>;
  markReferred(id: string): Promise<CommentUnlockRedemptionRecord>;
  findExistingRedemption(campaignId: string, externalUserId: string): Promise<CommentUnlockRedemptionRecord | null>;
}

export interface GrowthQueries {
  listUgc(storeId: string, limit?: number): Promise<UgcAssetRecord[]>;
  listAmbassadors(storeId: string, limit?: number): Promise<AmbassadorRecord[]>;
  listReferrals(storeId: string, limit?: number): Promise<ReferralOrderRecord[]>;
  listCampaigns(storeId: string, limit?: number): Promise<DmCampaignRecord[]>;
  listBackInStock(storeId: string, limit?: number): Promise<BackInStockSubscriptionRecord[]>;
  listCommentUnlockCampaigns(storeId: string): Promise<CommentUnlockCampaignRecord[]>;
}

export interface GrowthService {
  collectUgc(input: {
    storeId: string;
    creatorHandle?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    source: string;
    caption?: string | null;
  }): Promise<UgcAssetRecord>;
  requestRights(id: string, storeId: string): Promise<UgcAssetRecord>;
  approveRights(id: string, storeId: string, approvedBy: string): Promise<UgcAssetRecord>;
  enrollAmbassador(input: {
    storeId: string;
    customerId?: string | null;
    handle?: string | null;
    discountPct?: number;
    commissionPct?: number;
  }): Promise<AmbassadorRecord>;
  recordReferral(input: {
    storeId: string;
    ambassadorId: string;
    orderId: string;
    orderAmount: number;
  }): Promise<ReferralOrderRecord>;
  createDmCampaign(input: {
    storeId: string;
    campaignType: string;
    audienceCriteria?: unknown;
    scheduledAt?: Date | null;
  }): Promise<DmCampaignRecord>;
  sendDmCampaign(id: string, storeId: string): Promise<DmCampaignRecord>;
  subscribeBackInStock(input: {
    storeId: string;
    productId: string;
    externalUserId?: string | null;
    customerId?: string | null;
  }): Promise<BackInStockSubscriptionRecord>;
  notifyBackInStock(id: string, storeId: string): Promise<BackInStockSubscriptionRecord>;
  createCommentUnlockCampaign(input: {
    storeId: string;
    keyword: string;
    rewardType: "LINK" | "COUPON" | "MESSAGE";
    rewardValue?: string | null;
    message: string;
    referralAsk?: string | null;
  }): Promise<CommentUnlockCampaignRecord>;
  processCommentUnlock(input: {
    storeId: string;
    externalUserId: string;
    username: string | null;
    commentId: string | null;
    text: string;
    channel: "INSTAGRAM" | "FACEBOOK";
  }): Promise<{ sent: boolean; campaignId?: string }>;
}

export interface CustomerRecord {
  id: string;
  storeId: string;
  igUserId: string | null;
  fbUserId: string | null;
  username: string | null;
  interests: string[];
  tags: string[];
  createdAt: Date;
}

export interface FollowerRecord {
  id: string;
  storeId: string;
  customerId: string | null;
  igUserId: string | null;
  username: string | null;
  followedAt: Date;
  couponId: string | null;
  campaignEnrolledAt: Date | null;
  welcomeMessageText: string | null;
}

export interface CustomerCouponRecord {
  id: string;
  code: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
}

export interface CustomerCouponUsageRecord {
  couponId: string;
  usedAt: Date;
  orderRef: string | null;
}

export interface CustomerProfile {
  customer: CustomerRecord;
  coupons: CustomerCouponRecord[];
  usages: CustomerCouponUsageRecord[];
}

export interface CustomerRepository {
  /** Upsert a customer by store + external (IG/FB) id. */
  upsertByExternalId(input: {
    storeId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
    username: string | null;
  }): Promise<CustomerRecord>;

  listByStore(storeId: string, limit?: number): Promise<CustomerRecord[]>;

  /** Load the customer plus sent coupons and usages. */
  getProfile(input: {
    storeId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
  }): Promise<CustomerProfile | null>;

  /** Merge additional tags/interests onto a customer. */
  tag(input: {
    customerId: string;
    tags?: string[];
    interests?: string[];
  }): Promise<CustomerRecord>;

  /** Mark a coupon as sent to a customer. */
  recordCouponSent(input: {
    customerId: string;
    couponId: string;
  }): Promise<CustomerRecord>;

  /** Record that a customer used a coupon. */
  recordCouponUsed(input: {
    customerId: string;
    couponId: string;
    orderRef?: string;
  }): Promise<CustomerRecord>;
}

export interface FollowerRepository {
  /**
   * Record a follower. Returns `{ record, isNew }` where `isNew` is true only
   * the first time this follower is seen for the store.
   */
  record(input: {
    storeId: string;
    customerId: string | null;
    externalUserId: string;
    username: string | null;
  }): Promise<{ record: FollowerRecord; isNew: boolean }>;

  listByStore(storeId: string, limit?: number): Promise<FollowerRecord[]>;

  recordCampaignEnrollment(input: {
    followerId: string;
    couponId: string;
    welcomeMessageText: string;
  }): Promise<FollowerRecord>;
}

/** Public memory port consumed by the AI assistant. */
export interface CustomerMemory {
  getProfile(input: {
    storeId: string;
    externalUserId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
  }): Promise<CustomerProfile | null>;
}

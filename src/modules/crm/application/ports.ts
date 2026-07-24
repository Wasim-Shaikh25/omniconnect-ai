export interface CustomerRecord {
  id: string;
  storeId: string;
  igUserId: string | null;
  fbUserId: string | null;
  username: string | null;
  createdAt: Date;
}

export interface FollowerRecord {
  id: string;
  storeId: string;
  customerId: string | null;
  igUserId: string | null;
  username: string | null;
  followedAt: Date;
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
}

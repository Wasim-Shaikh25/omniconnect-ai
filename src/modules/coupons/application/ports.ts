export interface CampaignRecord {
  id: string;
  storeId: string;
  type: "FIRST_TIME_FOLLOWER";
  name: string;
  discountPct: number;
  couponTtlDays: number;
  messageTemplate: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignRepository {
  getByStoreAndType(
    storeId: string,
    type: "FIRST_TIME_FOLLOWER",
  ): Promise<CampaignRecord | null>;
  getOrCreateDefault(
    storeId: string,
    type: "FIRST_TIME_FOLLOWER",
  ): Promise<CampaignRecord>;
  update(
    storeId: string,
    type: "FIRST_TIME_FOLLOWER",
    input: Partial<Omit<CampaignRecord, "id" | "storeId" | "type" | "createdAt" | "updatedAt">>,
  ): Promise<CampaignRecord>;
}

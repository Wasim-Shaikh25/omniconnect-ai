export interface CampaignRecord {
  id: string;
  projectId: string;
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
    projectId: string,
    type: "FIRST_TIME_FOLLOWER",
  ): Promise<CampaignRecord | null>;
  getOrCreateDefault(
    projectId: string,
    type: "FIRST_TIME_FOLLOWER",
  ): Promise<CampaignRecord>;
  update(
    projectId: string,
    type: "FIRST_TIME_FOLLOWER",
    input: Partial<Omit<CampaignRecord, "id" | "projectId" | "type" | "createdAt" | "updatedAt">>,
  ): Promise<CampaignRecord>;
}

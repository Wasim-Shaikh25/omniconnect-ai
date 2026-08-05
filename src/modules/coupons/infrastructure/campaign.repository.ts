import { prisma } from "@/shared/database";
import type { CampaignRecord, CampaignRepository } from "../application/ports";

const DEFAULT_NAME = "First-Time Follower Welcome";
const DEFAULT_TEMPLATE = "Hi {{username}}! Thanks for following us. Welcome to the family — enjoy {{discount}} off your first order with code {{code}}.";

function toRecord(row: {
  id: string;
  projectId: string;
  type: string;
  name: string;
  discountPct: number;
  couponTtlDays: number;
  messageTemplate: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CampaignRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type as "FIRST_TIME_FOLLOWER",
    name: row.name,
    discountPct: row.discountPct,
    couponTtlDays: row.couponTtlDays,
    messageTemplate: row.messageTemplate,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaCampaignRepository implements CampaignRepository {
  async getByStoreAndType(
    projectId: string,
    type: "FIRST_TIME_FOLLOWER",
  ): Promise<CampaignRecord | null> {
    const row = await prisma.campaign.findUnique({
      where: { storeId_type: { projectId, type } },
    });
    return row ? toRecord(row) : null;
  }

  async getOrCreateDefault(
    projectId: string,
    type: "FIRST_TIME_FOLLOWER",
  ): Promise<CampaignRecord> {
    const row = await prisma.campaign.upsert({
      where: { storeId_type: { projectId, type } },
      update: {},
      create: {
        projectId,
        type,
        name: DEFAULT_NAME,
        discountPct: 10,
        couponTtlDays: 7,
        messageTemplate: DEFAULT_TEMPLATE,
        active: true,
      },
    });
    return toRecord(row);
  }

  async update(
    projectId: string,
    type: "FIRST_TIME_FOLLOWER",
    input: Partial<
      Omit<CampaignRecord, "id" | "projectId" | "type" | "createdAt" | "updatedAt">
    >,
  ): Promise<CampaignRecord> {
    const upserted = await prisma.campaign.upsert({
      where: { storeId_type: { projectId, type } },
      create: {
        projectId,
        type,
        name: input.name ?? DEFAULT_NAME,
        discountPct: input.discountPct ?? 10,
        couponTtlDays: input.couponTtlDays ?? 7,
        messageTemplate: input.messageTemplate ?? DEFAULT_TEMPLATE,
        active: input.active ?? true,
      },
      update: input,
    });
    return toRecord(upserted);
  }
}

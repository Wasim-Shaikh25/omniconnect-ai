import { prisma } from "@/shared/database";
import type { Prisma } from "@prisma/client";
import {
  UgcRightsStatus,
  AmbassadorStatus,
  ReferralOrderStatus,
  DmCampaignStatus,
  MentionSource,
  DmCampaignType,
  CommentUnlockRewardType,
  CommentUnlockStatus,
} from "@prisma/client";
import type {
  UgcAssetRecord,
  UgcRepository,
  AmbassadorRecord,
  AmbassadorRepository,
  ReferralOrderRecord,
  ReferralOrderRepository,
  DmCampaignRecord,
  DmCampaignRepository,
  BackInStockSubscriptionRecord,
  BackInStockRepository,
  CommentUnlockCampaignRecord,
  CommentUnlockRedemptionRecord,
  CommentUnlockRepository,
} from "../application/ports";

export class PrismaUgcRepository implements UgcRepository {
  async create(input: {
    storeId: string;
    socialMentionId?: string | null;
    customerId?: string | null;
    creatorHandle?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    source: string;
    caption?: string | null;
  }): Promise<UgcAssetRecord> {
    const created = await prisma.ugcAsset.create({
      data: {
        storeId: input.storeId,
        socialMentionId: input.socialMentionId ?? null,
        customerId: input.customerId ?? null,
        creatorHandle: input.creatorHandle ?? null,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        source: input.source as MentionSource,
        caption: input.caption ?? null,
        rightsStatus: UgcRightsStatus.PENDING,
      },
    });
    return toUgcRecord(created);
  }

  async listByStore(storeId: string, limit = 50): Promise<UgcAssetRecord[]> {
    const rows = await prisma.ugcAsset.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toUgcRecord);
  }

  async updateRights(
    id: string,
    storeId: string,
    status: string,
    approvedBy?: string | null,
  ): Promise<UgcAssetRecord> {
    const updated = await prisma.ugcAsset.update({
      where: { id, storeId },
      data: {
        rightsStatus: status as UgcRightsStatus,
        approvedBy: approvedBy ?? null,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
      },
    });
    return toUgcRecord(updated);
  }
}

export class PrismaAmbassadorRepository implements AmbassadorRepository {
  async create(input: {
    storeId: string;
    customerId?: string | null;
    code: string;
    discountPct?: number;
    commissionPct?: number;
    status?: string;
  }): Promise<AmbassadorRecord> {
    const created = await prisma.ambassador.create({
      data: {
        storeId: input.storeId,
        customerId: input.customerId ?? null,
        code: input.code,
        discountPct: input.discountPct ?? 10,
        commissionPct: input.commissionPct ?? 5,
        status: (input.status ?? "PENDING") as AmbassadorStatus,
      },
    });
    return toAmbassadorRecord(created);
  }

  async listByStore(storeId: string, limit = 50): Promise<AmbassadorRecord[]> {
    const rows = await prisma.ambassador.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toAmbassadorRecord);
  }

  async findById(id: string, storeId: string): Promise<AmbassadorRecord | null> {
    const row = await prisma.ambassador.findUnique({ where: { id, storeId } });
    return row ? toAmbassadorRecord(row) : null;
  }

  async incrementEarnings(
    id: string,
    storeId: string,
    amount: number,
    referrals: number,
  ): Promise<AmbassadorRecord> {
    const updated = await prisma.ambassador.update({
      where: { id, storeId },
      data: {
        totalEarnings: { increment: amount },
        totalReferrals: { increment: referrals },
      },
    });
    return toAmbassadorRecord(updated);
  }
}

export class PrismaReferralOrderRepository implements ReferralOrderRepository {
  async create(input: {
    storeId: string;
    ambassadorId: string;
    orderId: string;
    orderAmount: number;
    commissionAmount: number;
    status?: string;
  }): Promise<ReferralOrderRecord> {
    const created = await prisma.referralOrder.create({
      data: {
        storeId: input.storeId,
        ambassadorId: input.ambassadorId,
        orderId: input.orderId,
        orderAmount: input.orderAmount,
        commissionAmount: input.commissionAmount,
        status: (input.status ?? "PENDING") as ReferralOrderStatus,
      },
    });
    return toReferralOrderRecord(created);
  }

  async listByStore(
    storeId: string,
    limit = 50,
  ): Promise<ReferralOrderRecord[]> {
    const rows = await prisma.referralOrder.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toReferralOrderRecord);
  }
}

export class PrismaDmCampaignRepository implements DmCampaignRepository {
  async create(input: {
    storeId: string;
    campaignType: string;
    audienceCriteria?: unknown;
    status?: string;
    scheduledAt?: Date | null;
  }): Promise<DmCampaignRecord> {
    const created = await prisma.dmCampaign.create({
      data: {
        storeId: input.storeId,
        campaignType: input.campaignType as DmCampaignType,
        audienceCriteria: input.audienceCriteria as Prisma.InputJsonValue,
        status: (input.status ?? "DRAFT") as DmCampaignStatus,
        scheduledAt: input.scheduledAt ?? null,
      },
    });
    return toDmCampaignRecord(created);
  }

  async listByStore(
    storeId: string,
    limit = 50,
  ): Promise<DmCampaignRecord[]> {
    const rows = await prisma.dmCampaign.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toDmCampaignRecord);
  }

  async markSent(id: string, storeId: string, metrics?: unknown): Promise<DmCampaignRecord> {
    const updated = await prisma.dmCampaign.update({
      where: { id, storeId },
      data: {
        status: "SENT" as DmCampaignStatus,
        sentAt: new Date(),
        metrics: metrics as Prisma.InputJsonValue,
      },
    });
    return toDmCampaignRecord(updated);
  }
}

export class PrismaBackInStockRepository implements BackInStockRepository {
  async create(input: {
    storeId: string;
    productId: string;
    externalUserId?: string | null;
    customerId?: string | null;
  }): Promise<BackInStockSubscriptionRecord> {
    const created = await prisma.backInStockSubscription.create({
      data: {
        storeId: input.storeId,
        productId: input.productId,
        externalUserId: input.externalUserId ?? null,
        customerId: input.customerId ?? null,
      },
    });
    return toBackInStockRecord(created);
  }

  async listByStore(
    storeId: string,
    limit = 50,
  ): Promise<BackInStockSubscriptionRecord[]> {
    const rows = await prisma.backInStockSubscription.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toBackInStockRecord);
  }

  async markNotified(id: string, storeId: string): Promise<BackInStockSubscriptionRecord> {
    const updated = await prisma.backInStockSubscription.update({
      where: { id, storeId },
      data: { notifiedAt: new Date() },
    });
    return toBackInStockRecord(updated);
  }
}

function toUgcRecord(row: {
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
}): UgcAssetRecord {
  return { ...row };
}

function toAmbassadorRecord(row: {
  id: string;
  storeId: string;
  customerId: string | null;
  code: string;
  discountPct: number;
  commissionPct: number;
  status: string;
  totalReferrals: number;
  totalEarnings: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AmbassadorRecord {
  return {
    ...row,
    totalEarnings: Number(row.totalEarnings),
  };
}

function toReferralOrderRecord(row: {
  id: string;
  storeId: string;
  ambassadorId: string;
  orderId: string;
  orderAmount: unknown;
  commissionAmount: unknown;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ReferralOrderRecord {
  return {
    ...row,
    orderAmount: Number(row.orderAmount),
    commissionAmount: Number(row.commissionAmount),
  };
}

function toDmCampaignRecord(row: {
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
}): DmCampaignRecord {
  return { ...row };
}

function toBackInStockRecord(row: {
  id: string;
  storeId: string;
  productId: string;
  externalUserId: string | null;
  customerId: string | null;
  notifiedAt: Date | null;
  createdAt: Date;
}): BackInStockSubscriptionRecord {
  return { ...row };
}

export class PrismaCommentUnlockRepository
  implements CommentUnlockRepository
{
  async createCampaign(input: {
    storeId: string;
    keyword: string;
    rewardType: "LINK" | "COUPON" | "MESSAGE";
    rewardValue?: string | null;
    message: string;
    referralAsk?: string | null;
  }): Promise<CommentUnlockCampaignRecord> {
    const created = await prisma.commentUnlockCampaign.create({
      data: {
        storeId: input.storeId,
        keyword: input.keyword.toLowerCase().trim(),
        rewardType: input.rewardType as CommentUnlockRewardType,
        rewardValue: input.rewardValue ?? null,
        message: input.message,
        referralAsk: input.referralAsk ?? null,
      },
    });
    return toCommentUnlockCampaignRecord(created);
  }

  async listCampaignsByStore(
    storeId: string,
  ): Promise<CommentUnlockCampaignRecord[]> {
    const rows = await prisma.commentUnlockCampaign.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCommentUnlockCampaignRecord);
  }

  async findActiveCampaignByKeyword(
    storeId: string,
    keyword: string,
  ): Promise<CommentUnlockCampaignRecord | null> {
    const row = await prisma.commentUnlockCampaign.findFirst({
      where: {
        storeId,
        active: true,
        keyword: keyword.toLowerCase().trim(),
      },
    });
    return row ? toCommentUnlockCampaignRecord(row) : null;
  }

  async createRedemption(input: {
    campaignId: string;
    storeId: string;
    externalUserId: string;
    username?: string | null;
    commentId?: string | null;
  }): Promise<CommentUnlockRedemptionRecord> {
    const created = await prisma.commentUnlockRedemption.create({
      data: {
        campaignId: input.campaignId,
        storeId: input.storeId,
        externalUserId: input.externalUserId,
        username: input.username ?? null,
        commentId: input.commentId ?? null,
        status: CommentUnlockStatus.PENDING,
      },
    });
    return toCommentUnlockRedemptionRecord(created);
  }

  async listRedemptionsByCampaign(
    campaignId: string,
  ): Promise<CommentUnlockRedemptionRecord[]> {
    const rows = await prisma.commentUnlockRedemption.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCommentUnlockRedemptionRecord);
  }

  async markSent(id: string, storeId: string): Promise<CommentUnlockRedemptionRecord> {
    const updated = await prisma.commentUnlockRedemption.update({
      where: { id, storeId },
      data: { status: CommentUnlockStatus.SENT, sentAt: new Date() },
    });
    return toCommentUnlockRedemptionRecord(updated);
  }

  async markReferred(id: string, storeId: string): Promise<CommentUnlockRedemptionRecord> {
    const updated = await prisma.commentUnlockRedemption.update({
      where: { id, storeId },
      data: { status: CommentUnlockStatus.REFERRED },
    });
    return toCommentUnlockRedemptionRecord(updated);
  }

  async findExistingRedemption(
    campaignId: string,
    externalUserId: string,
  ): Promise<CommentUnlockRedemptionRecord | null> {
    const row = await prisma.commentUnlockRedemption.findFirst({
      where: { campaignId, externalUserId },
    });
    return row ? toCommentUnlockRedemptionRecord(row) : null;
  }
}

function toCommentUnlockCampaignRecord(row: {
  id: string;
  storeId: string;
  keyword: string;
  rewardType: string;
  rewardValue: string | null;
  message: string;
  referralAsk: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CommentUnlockCampaignRecord {
  return {
    ...row,
    rewardType: row.rewardType as "LINK" | "COUPON" | "MESSAGE",
  };
}

function toCommentUnlockRedemptionRecord(row: {
  id: string;
  campaignId: string;
  storeId: string;
  externalUserId: string;
  username: string | null;
  commentId: string | null;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
}): CommentUnlockRedemptionRecord {
  return {
    ...row,
    status: row.status as "PENDING" | "SENT" | "REFERRED",
  };
}

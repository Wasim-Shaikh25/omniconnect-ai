import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  AttributionLink,
  AttributionLinkRepository,
  CreateAttributionLinkInput,
} from "../application/ports";

type Row = {
  id: string;
  projectId: string;
  couponId: string | null;
  fullUrl: string;
  shortCode: string;
  utmSource: string;
  utmMedium: string | null;
  utmCampaign: string | null;
  clicks: number;
  conversions: number;
  revenue: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: Row): AttributionLink {
  return {
    id: row.id,
    projectId: row.projectId,
    couponId: row.couponId,
    fullUrl: row.fullUrl,
    shortCode: row.shortCode,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    clicks: row.clicks,
    conversions: row.conversions,
    revenue: row.revenue.toNumber(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAttributionLinkRepository implements AttributionLinkRepository {
  async create(input: CreateAttributionLinkInput): Promise<AttributionLink> {
    const row = await prisma.attributionLink.create({
      data: {
        projectId: input.projectId,
        couponId: input.couponId ?? null,
        fullUrl: input.fullUrl,
        shortCode: input.shortCode,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
      },
    });
    return toRecord(row as Row);
  }

  async findByShortCode(shortCode: string): Promise<AttributionLink | null> {
    const row = await prisma.attributionLink.findUnique({
      where: { shortCode },
    });
    return row ? toRecord(row as Row) : null;
  }

  async findByCoupon(couponId: string): Promise<AttributionLink | null> {
    const row = await prisma.attributionLink.findFirst({
      where: { couponId },
    });
    return row ? toRecord(row as Row) : null;
  }

  async listByProject(
    projectId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<AttributionLink[]> {
    const rows = await prisma.attributionLink.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });
    return rows.map((r) => toRecord(r as Row));
  }

  async countByProjectThisMonth(projectId: string, now = new Date()): Promise<number> {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return prisma.attributionLink.count({
      where: {
        projectId,
        createdAt: { gte: startOfMonth },
      },
    });
  }

  async incrementConversion(id: string, revenue: number): Promise<AttributionLink | null> {
    const row = await prisma.attributionLink.update({
      where: { id },
      data: {
        conversions: { increment: 1 },
        revenue: { increment: revenue },
      },
    });
    return row ? toRecord(row as Row) : null;
  }

  async incrementClick(id: string): Promise<AttributionLink | null> {
    const row = await prisma.attributionLink.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
    return row ? toRecord(row as Row) : null;
  }
}

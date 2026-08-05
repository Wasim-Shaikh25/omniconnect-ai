import { prisma } from "@/shared/database";
import type {
  BrandDealRecord,
  BrandDealRepository,
  BrandDealStatus,
  CreateBrandDealInput,
} from "../application/ports";

function toRecord(row: {
  id: string;
  projectId: string;
  brandName: string;
  contactEmail: string | null;
  value: number | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BrandDealRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    brandName: row.brandName,
    contactEmail: row.contactEmail,
    value: row.value,
    status: row.status as BrandDealStatus,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaBrandDealRepository implements BrandDealRepository {
  async listByStore(
    projectId: string,
    limit = 50,
  ): Promise<BrandDealRecord[]> {
    const rows = await prisma.brandDeal.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async create(input: CreateBrandDealInput): Promise<BrandDealRecord> {
    const row = await prisma.brandDeal.create({
      data: {
        projectId: input.projectId,
        brandName: input.brandName,
        contactEmail: input.contactEmail ?? null,
        value: input.value ?? null,
        status: input.status ?? "LEAD",
        notes: input.notes ?? null,
      },
    });
    return toRecord(row);
  }
}

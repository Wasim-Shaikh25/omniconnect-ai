import { prisma } from "@/shared/database";
import type {
  CustomerRecord,
  CustomerRepository,
} from "../application/ports";

type PrismaCustomer = {
  id: string;
  storeId: string;
  igUserId: string | null;
  fbUserId: string | null;
  username: string | null;
  createdAt: Date;
};

function toRecord(c: PrismaCustomer): CustomerRecord {
  return {
    id: c.id,
    storeId: c.storeId,
    igUserId: c.igUserId,
    fbUserId: c.fbUserId,
    username: c.username,
    createdAt: c.createdAt,
  };
}

export class PrismaCustomerRepository implements CustomerRepository {
  async upsertByExternalId(input: {
    storeId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
    username: string | null;
  }): Promise<CustomerRecord> {
    const idField = input.channel === "INSTAGRAM" ? "igUserId" : "fbUserId";

    const existing = await prisma.customer.findFirst({
      where: { storeId: input.storeId, [idField]: input.externalUserId },
    });

    if (existing) {
      const updated =
        input.username && input.username !== existing.username
          ? await prisma.customer.update({
              where: { id: existing.id },
              data: { username: input.username },
            })
          : existing;
      return toRecord(updated);
    }

    const created = await prisma.customer.create({
      data: {
        storeId: input.storeId,
        username: input.username,
        [idField]: input.externalUserId,
      },
    });
    return toRecord(created);
  }

  async listByStore(storeId: string, limit = 50): Promise<CustomerRecord[]> {
    const rows = await prisma.customer.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }
}

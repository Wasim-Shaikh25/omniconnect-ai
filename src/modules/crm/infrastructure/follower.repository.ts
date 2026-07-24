import { prisma } from "@/shared/database";
import type {
  FollowerRecord,
  FollowerRepository,
} from "../application/ports";

type PrismaFollower = {
  id: string;
  storeId: string;
  customerId: string | null;
  igUserId: string | null;
  username: string | null;
  followedAt: Date;
};

function toRecord(f: PrismaFollower): FollowerRecord {
  return {
    id: f.id,
    storeId: f.storeId,
    customerId: f.customerId,
    igUserId: f.igUserId,
    username: f.username,
    followedAt: f.followedAt,
  };
}

export class PrismaFollowerRepository implements FollowerRepository {
  async record(input: {
    storeId: string;
    customerId: string | null;
    externalUserId: string;
    username: string | null;
  }): Promise<{ record: FollowerRecord; isNew: boolean }> {
    const existing = await prisma.follower.findUnique({
      where: {
        storeId_igUserId: {
          storeId: input.storeId,
          igUserId: input.externalUserId,
        },
      },
    });
    if (existing) return { record: toRecord(existing), isNew: false };

    const created = await prisma.follower.create({
      data: {
        storeId: input.storeId,
        customerId: input.customerId,
        igUserId: input.externalUserId,
        username: input.username,
      },
    });
    return { record: toRecord(created), isNew: true };
  }

  async listByStore(storeId: string, limit = 50): Promise<FollowerRecord[]> {
    const rows = await prisma.follower.findMany({
      where: { storeId },
      orderBy: { followedAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }
}

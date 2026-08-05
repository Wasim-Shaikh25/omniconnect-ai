import { prisma } from "@/shared/database";
import type {
  FollowerRecord,
  FollowerRepository,
} from "../application/ports";

type PrismaFollower = {
  id: string;
  projectId: string;
  customerId: string | null;
  igUserId: string | null;
  username: string | null;
  followedAt: Date;
  couponId: string | null;
  campaignEnrolledAt: Date | null;
  welcomeMessageText: string | null;
};

function toRecord(f: PrismaFollower): FollowerRecord {
  return {
    id: f.id,
    projectId: f.projectId,
    customerId: f.customerId,
    igUserId: f.igUserId,
    username: f.username,
    followedAt: f.followedAt,
    couponId: f.couponId,
    campaignEnrolledAt: f.campaignEnrolledAt,
    welcomeMessageText: f.welcomeMessageText,
  };
}

export class PrismaFollowerRepository implements FollowerRepository {
  async record(input: {
    projectId: string;
    customerId: string | null;
    externalUserId: string;
    username: string | null;
  }): Promise<{ record: FollowerRecord; isNew: boolean }> {
    const existing = await prisma.follower.findUnique({
      where: {
        storeId_igUserId: {
          projectId: input.projectId,
          igUserId: input.externalUserId,
        },
      },
    });
    if (existing) return { record: toRecord(existing), isNew: false };

    const created = await prisma.follower.create({
      data: {
        projectId: input.projectId,
        customerId: input.customerId,
        igUserId: input.externalUserId,
        username: input.username,
      },
    });
    return { record: toRecord(created), isNew: true };
  }

  async listByStore(
    projectId: string,
    options: { limit?: number; offset?: number; search?: string } = {},
  ): Promise<FollowerRecord[]> {
    const rows = await prisma.follower.findMany({
      where: {
        projectId,
        ...(options.search
          ? { username: { contains: options.search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { followedAt: "desc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });
    return rows.map(toRecord);
  }

  async countByStore(projectId: string, search?: string): Promise<number> {
    return prisma.follower.count({
      where: {
        projectId,
        ...(search ? { username: { contains: search, mode: "insensitive" } } : {}),
      },
    });
  }

  async recordCampaignEnrollment(input: {
    followerId: string;
    projectId: string;
    couponId: string;
    welcomeMessageText: string;
  }): Promise<FollowerRecord> {
    const updated = await prisma.follower.update({
      where: { id: input.followerId, projectId: input.projectId },
      data: {
        couponId: input.couponId,
        campaignEnrolledAt: new Date(),
        welcomeMessageText: input.welcomeMessageText,
      },
    });
    return toRecord(updated);
  }
}

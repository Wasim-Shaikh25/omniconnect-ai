import { prisma } from "@/shared/database";
import { encryptString, decryptString } from "@/shared/security/encryption";
import type { MetaChannel } from "../domain/types";
import type {
  MetaIntegrationRecord,
  MetaIntegrationRepository,
} from "../application/ports";

type PrismaIntegration = {
  id: string;
  projectId: string;
  provider: string;
  externalId: string | null;
  createdAt: Date;
};

function toChannel(provider: string): MetaChannel {
  return provider === "INSTAGRAM" ? "INSTAGRAM" : "FACEBOOK";
}

function toRecord(i: PrismaIntegration): MetaIntegrationRecord {
  return {
    id: i.id,
    projectId: i.projectId,
    channel: toChannel(i.provider),
    accountId: i.externalId,
    connectedAt: i.createdAt,
  };
}

/**
 * Owns META `Integration` persistence. The channel is stored in `provider`
 * (INSTAGRAM | FACEBOOK) and the page/IG id in `externalId`; the page token in
 * `accessToken` (read only here, never returned in the public record).
 */
export class PrismaMetaIntegrationRepository
  implements MetaIntegrationRepository
{
  async connect(input: {
    projectId: string;
    channel: MetaChannel;
    accountId: string | null;
    accessToken: string | null;
    refreshToken?: string | null;
  }): Promise<MetaIntegrationRecord> {
    const existing = await prisma.ecommerceConnection.findFirst({
      where: { projectId: input.projectId, type: "META", provider: input.channel },
    });

    const data = {
      type: "META" as const,
      provider: input.channel,
      externalId: input.accountId,
      accessToken: await encryptString(input.accessToken),
      refreshToken: await encryptString(input.refreshToken ?? null),
      projectId: input.projectId,
    };

    const saved = existing
      ? await prisma.ecommerceConnection.update({ where: { id: existing.id }, data })
      : await prisma.ecommerceConnection.create({ data });

    return toRecord(saved);
  }

  async findByStore(projectId: string): Promise<MetaIntegrationRecord | null> {
    const found = await prisma.ecommerceConnection.findFirst({
      where: { projectId, type: "META" },
      orderBy: { createdAt: "desc" },
    });
    return found ? toRecord(found) : null;
  }

  async findStoreByAccountId(accountId: string): Promise<string | null> {
    const found = await prisma.ecommerceConnection.findFirst({
      where: { type: "META", externalId: accountId },
      select: { projectId: true },
    });
    return found?.projectId ?? null;
  }

  async findAccessToken(
    projectId: string,
    channel?: MetaChannel,
  ): Promise<string | null> {
    const found = await prisma.ecommerceConnection.findFirst({
      where: {
        projectId,
        type: "META",
        ...(channel ? { provider: channel } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { accessToken: true },
    });
    return await decryptString(found?.accessToken ?? null);
  }
}

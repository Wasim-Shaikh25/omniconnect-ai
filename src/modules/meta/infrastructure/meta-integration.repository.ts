import { prisma } from "@/shared/database";
import type { MetaChannel } from "../domain/types";
import type {
  MetaIntegrationRecord,
  MetaIntegrationRepository,
} from "../application/ports";

type PrismaIntegration = {
  id: string;
  storeId: string;
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
    storeId: i.storeId,
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
    storeId: string;
    channel: MetaChannel;
    accountId: string | null;
    accessToken: string | null;
  }): Promise<MetaIntegrationRecord> {
    const existing = await prisma.integration.findFirst({
      where: { storeId: input.storeId, type: "META", provider: input.channel },
    });

    const data = {
      type: "META" as const,
      provider: input.channel,
      externalId: input.accountId,
      accessToken: input.accessToken,
      storeId: input.storeId,
    };

    const saved = existing
      ? await prisma.integration.update({ where: { id: existing.id }, data })
      : await prisma.integration.create({ data });

    return toRecord(saved);
  }

  async findByStore(storeId: string): Promise<MetaIntegrationRecord | null> {
    const found = await prisma.integration.findFirst({
      where: { storeId, type: "META" },
      orderBy: { createdAt: "desc" },
    });
    return found ? toRecord(found) : null;
  }

  async findStoreByAccountId(accountId: string): Promise<string | null> {
    const found = await prisma.integration.findFirst({
      where: { type: "META", externalId: accountId },
      select: { storeId: true },
    });
    return found?.storeId ?? null;
  }

  async findAccessToken(
    storeId: string,
    channel?: MetaChannel,
  ): Promise<string | null> {
    const found = await prisma.integration.findFirst({
      where: {
        storeId,
        type: "META",
        ...(channel ? { provider: channel } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { accessToken: true },
    });
    return found?.accessToken ?? null;
  }
}

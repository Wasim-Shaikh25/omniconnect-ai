import { prisma } from "@/shared/database";
import { encryptString, decryptString } from "@/shared/security/encryption";
import type { MetaChannel } from "../domain/types";
import type {
  MetaIntegrationRecord,
  MetaIntegrationRepository,
} from "../application/ports";

const TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function toRecord(project: {
  id: string;
  metaAccountId: string | null;
  metaPixelId: string | null;
  createdAt: Date;
}): MetaIntegrationRecord {
  return {
    id: project.id,
    projectId: project.id,
    channel: "FACEBOOK",
    accountId: project.metaAccountId,
    pixelId: project.metaPixelId,
    connectedAt: project.createdAt,
  };
}

export class PrismaMetaIntegrationRepository
  implements MetaIntegrationRepository
{
  async connect(input: {
    projectId: string;
    channel: MetaChannel;
    accountId: string | null;
    pixelId?: string | null;
    accessToken: string | null;
    refreshToken?: string | null;
  }): Promise<MetaIntegrationRecord> {
    // Meta tokens are stored directly on the Project row.
    const expiresAt = input.accessToken
      ? new Date(Date.now() + TOKEN_TTL_MS)
      : null;

    const updated = await prisma.project.update({
      where: { id: input.projectId },
      data: {
        metaAccountId: input.accountId,
        metaPixelId: input.pixelId ?? null,
        metaAccessToken: await encryptString(input.accessToken),
        metaTokenExpiresAt: expiresAt,
      },
    });

    return toRecord(updated);
  }

  async findByStore(projectId: string): Promise<MetaIntegrationRecord | null> {
    const found = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!found || !found.metaAccountId) return null;
    return toRecord(found as { id: string; metaAccountId: string | null; metaPixelId: string | null; createdAt: Date });
  }

  async findStoreByAccountId(accountId: string): Promise<string | null> {
    const found = await prisma.project.findFirst({
      where: { metaAccountId: accountId },
      select: { id: true },
    });
    return found?.id ?? null;
  }

  async findAccessToken(projectId: string): Promise<string | null> {
    const found = await prisma.project.findUnique({
      where: { id: projectId },
      select: { metaAccessToken: true },
    });
    return decryptString(found?.metaAccessToken ?? null);
  }
}

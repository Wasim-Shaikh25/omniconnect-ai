import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import {
  encryptString,
  decryptString,
} from "@/shared/security/encryption";
import type {
  GeneratedAdapterRecord,
  GeneratedAdapterRepository,
} from "../application/ports";
import type { AdapterConfigMapping } from "../domain/adapter-config";

function parseConfig(value: Prisma.JsonValue): AdapterConfigMapping | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as unknown as AdapterConfigMapping;
  }
  return null;
}

async function parseCredentials(
  encrypted: string | null,
): Promise<Record<string, string>> {
  if (!encrypted) return {};
  const plain = await decryptString(encrypted);
  if (!plain) return {};
  try {
    const parsed = JSON.parse(plain);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // fall through to single-token mapping
  }
  return {};
}

export class PrismaGeneratedAdapterRepository
  implements GeneratedAdapterRepository
{
  async upsert(input: {
    projectId: string;
    platformName: string;
    config: AdapterConfigMapping;
    credentials: Record<string, string>;
  }): Promise<GeneratedAdapterRecord> {
    const credentials = await encryptString(JSON.stringify(input.credentials));
    if (!credentials) {
      throw new Error("Failed to encrypt adapter credentials");
    }
    const data = {
      projectId: input.projectId,
      platformName: input.platformName,
      config: input.config as unknown as Prisma.InputJsonValue,
      credentials,
      isActive: true,
    };

    const existing = await prisma.generatedAdapter.findUnique({
      where: { projectId: input.projectId },
    });

    const saved = existing
      ? await prisma.generatedAdapter.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.generatedAdapter.create({ data });

    return {
      id: saved.id,
      projectId: saved.projectId,
      platformName: saved.platformName,
      config: parseConfig(saved.config) ?? input.config,
      credentials: await parseCredentials(saved.credentials),
      isActive: saved.isActive,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async findByProject(
    projectId: string,
  ): Promise<GeneratedAdapterRecord | null> {
    const found = await prisma.generatedAdapter.findUnique({
      where: { projectId },
    });
    if (!found) return null;

    const config = parseConfig(found.config);
    if (!config) return null;

    return {
      id: found.id,
      projectId: found.projectId,
      platformName: found.platformName,
      config,
      credentials: await parseCredentials(found.credentials),
      isActive: found.isActive,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }

  async delete(projectId: string): Promise<void> {
    await prisma.generatedAdapter.deleteMany({ where: { projectId } });
  }
}

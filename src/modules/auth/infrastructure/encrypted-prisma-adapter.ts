import type { Adapter, AdapterAccount } from "@auth/core/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";
import { encryptString, decryptString } from "@/shared/security/encryption";

type AccountTokenFields = "access_token" | "refresh_token" | "id_token";

async function encryptAccountTokens<T extends Partial<AdapterAccount>>(
  account: T,
): Promise<T> {
  const encrypted = { ...account } as Record<string, unknown>;
  const fields: AccountTokenFields[] = ["access_token", "refresh_token", "id_token"];
  for (const field of fields) {
    const value = account[field];
    if (typeof value === "string" && value) {
      encrypted[field] = await encryptString(value);
    }
  }
  return encrypted as T;
}

async function decryptAccountTokens(
  account: AdapterAccount | null,
): Promise<AdapterAccount | null> {
  if (!account) return null;
  const decrypted = { ...account } as Record<string, unknown>;
  const fields: AccountTokenFields[] = ["access_token", "refresh_token", "id_token"];
  for (const field of fields) {
    const value = account[field];
    if (typeof value === "string") {
      decrypted[field] = await decryptString(value);
    }
  }
  return decrypted as AdapterAccount;
}

/**
 * Wraps the Auth.js Prisma adapter so OAuth tokens stored in `Account` are
 * encrypted at rest and decrypted on read. Existing plaintext values remain
 * readable (backwards-compatible) until the account is linked again.
 */
export function EncryptedPrismaAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async linkAccount(data) {
      const encrypted = await encryptAccountTokens(data);
      const linked = await base.linkAccount?.(encrypted);
      return linked ?? null;
    },
    async getAccount(providerAccountId, provider) {
      const account = await base.getAccount?.(providerAccountId, provider);
      return decryptAccountTokens(account ?? null);
    },
  };
}

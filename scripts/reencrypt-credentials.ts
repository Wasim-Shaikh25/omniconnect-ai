import { env } from "@/shared/config";
import { prisma } from "@/shared/database/prisma";
import { decryptString, encryptString } from "@/shared/security/encryption";

async function reencryptCredentials() {
  if (!env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is required to re-encrypt credentials.");
  }

  if (!env.ENCRYPTION_KEY_PREVIOUS) {
    console.warn(
      "[reencrypt] ENCRYPTION_KEY_PREVIOUS is not set. Tokens encrypted with a prior key will fail to decrypt.",
    );
  }

  const integrations = await prisma.integration.findMany({
    select: {
      id: true,
      storeId: true,
      accessToken: true,
      refreshToken: true,
    },
  });

  let updated = 0;
  let failed = 0;

  for (const integration of integrations) {
    const changes: { accessToken?: string | null; refreshToken?: string | null } = {};

    try {
      if (integration.accessToken) {
        const decrypted = await decryptString(integration.accessToken);
        if (decrypted !== null) {
          changes.accessToken = await encryptString(decrypted);
        }
      }

      if (integration.refreshToken) {
        const decrypted = await decryptString(integration.refreshToken);
        if (decrypted !== null) {
          changes.refreshToken = await encryptString(decrypted);
        }
      }

      if (Object.keys(changes).length > 0) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: changes,
        });
        updated++;
      }
    } catch (error) {
      failed++;
      console.error({
        level: "error",
        message: "reencrypt.integrationFailed",
        integrationId: integration.id,
        storeId: integration.storeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info({
    level: "info",
    message: "reencrypt.complete",
    scanned: integrations.length,
    updated,
    failed,
  });

  if (failed > 0) {
    process.exit(1);
  }
}

reencryptCredentials().catch((error) => {
  console.error({
    level: "error",
    message: "reencrypt.fatal",
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

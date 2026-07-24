import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. In development, avoid exhausting connections during
 * hot-reload by caching the client on `globalThis`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

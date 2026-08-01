import { prisma } from "@/shared/database";

const EXCLUDED_TABLES = new Set(["prisma_migrations"]);

export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetDatabase must not be used in production");
  }

  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  const tables = rows
    .map((r) => r.tablename)
    .filter((t) => !EXCLUDED_TABLES.has(t) && !t.startsWith("_"));

  if (tables.length === 0) return;

  const quoted = tables.map((t) => `"public"."${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} CASCADE`);
}

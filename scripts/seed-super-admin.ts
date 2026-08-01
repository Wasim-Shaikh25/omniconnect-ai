import { prisma } from "@/shared/database";
import {
  accounts,
  hasher,
  ensureSuperAdmin,
} from "@/modules/auth/infrastructure/container";

async function main() {
  await ensureSuperAdmin({ accounts, hasher });
  console.log("Super admin seeding completed successfully");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

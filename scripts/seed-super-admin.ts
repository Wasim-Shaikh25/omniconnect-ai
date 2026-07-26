import { prisma } from "@/shared/database";
import bcrypt from "bcryptjs";

async function main() {
  const hash = await bcrypt.hash("Password123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { isSuperAdmin: true },
    create: {
      email: "admin@example.com",
      name: "Super Admin",
      passwordHash: hash,
      role: "STORE_OWNER",
      isSuperAdmin: true,
    },
  });
  console.log("Super admin:", user.id, user.email, user.isSuperAdmin);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { deleteAccountService } from "@/modules/users";

const GRACE_DAYS = 30;

async function main() {
  const before = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);
  const count = await deleteAccountService.cleanupExpired(before);
  console.log(`Hard-deleted ${count} accounts older than ${GRACE_DAYS} days.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

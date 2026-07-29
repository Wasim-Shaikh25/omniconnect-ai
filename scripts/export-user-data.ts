import { dataExportService, userRepository } from "@/modules/users";

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: tsx scripts/export-user-data.ts <user-id>");
    process.exit(1);
  }
  const user = await userRepository.findById(userId);
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }
  const data = await dataExportService.getExport(userId);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

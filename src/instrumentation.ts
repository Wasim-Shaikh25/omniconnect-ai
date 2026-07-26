import { validateProductionSecrets } from "@/shared/config";
import { ensureSuperAdmin } from "@/modules/auth";

export async function register() {
  validateProductionSecrets();
  await ensureSuperAdmin();
}

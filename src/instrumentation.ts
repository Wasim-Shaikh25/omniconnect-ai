import { validateProductionSecrets } from "@/shared/config";

export async function register() {
  validateProductionSecrets();
}

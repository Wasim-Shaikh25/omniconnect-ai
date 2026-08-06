import { env } from "@/shared/config";
import { organizationQueries } from "@/modules/workspaces";
import { PrismaTokenUsageRepository } from "./infrastructure/token-usage.repository";
import { OpenRouterProvider } from "./infrastructure/openrouter.provider";

export const tokenUsageRepository = new PrismaTokenUsageRepository();

export const aiProvider = new OpenRouterProvider(
  {
    apiKey: env.OPENROUTER_API_KEY ?? "",
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_SITE_NAME,
    defaultModel: env.AI_DEFAULT_MODEL,
  },
  {
    tokenUsageRepository,
    resolveUserId: organizationQueries.getOrganizationIdByStoreId,
  },
);

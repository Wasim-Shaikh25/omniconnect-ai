import { eventBus } from "@/shared/events";
import { crmQueries } from "@/modules/crm";
import {
  conversationCommands,
  conversationQueries,
} from "@/modules/conversations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { metaService } from "@/modules/meta";
import { makeGenerateReply } from "../application/generate-reply";
import { makeGenerateWelcome } from "../application/generate-welcome";
import { makeUpdateAIConfiguration } from "../application/update-config";
import { PrismaAIConfigurationRepository } from "./ai-configuration.repository";
import { OpenAIProvider } from "./openai.provider";

const aiConfigurationRepository = new PrismaAIConfigurationRepository();
const aiProvider = new OpenAIProvider();

/** Composition root for the ai module. */
export const aiQueries = {
  getConfiguration: (storeId: string) =>
    aiConfigurationRepository.getByStore(storeId),
};

export const generateWelcome = makeGenerateWelcome({
  aiProvider,
  aiConfigurationRepository,
});

export const generateReply = makeGenerateReply({
  aiProvider,
  aiConfigurationRepository,
  conversationQueries,
  conversationCommands,
  crmQueries,
  ecommerceQueries,
  metaService,
  eventBus,
});

export const updateAIConfiguration = makeUpdateAIConfiguration({
  repository: aiConfigurationRepository,
});

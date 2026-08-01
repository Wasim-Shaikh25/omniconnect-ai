import { eventBus } from "@/shared/events";
import { crmQueries } from "@/modules/crm";
import {
  conversationCommands,
  conversationQueries,
} from "@/modules/conversations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { organizationQueries, organizationUsage } from "@/modules/organizations";
import { notificationQueries } from "@/modules/notifications";
import { auditCommands } from "@/modules/users";
import { metaService } from "@/modules/meta/server";
import {
  updateMarketingMemory,
  generateDailyBrief,
  businessBrainContextService,
  dailyActionService,
  journeyService,
} from "@/modules/intelligence/server";
import { makeGenerateReply } from "../application/generate-reply";
import { makeGenerateWelcome } from "../application/generate-welcome";
import { makeUpdateAIConfiguration } from "../application/update-config";
import { makeGenerateCaptions } from "../application/generate-captions";
import { makeGenerateTrends } from "../application/generate-trends";
import { makeGeneratePostIdeas } from "../application/generate-post-ideas";
import { makeAnalyzeCompetitor } from "../application/analyze-competitor";
import { makeAnalyzeMedia } from "../application/analyze-media";
import { makeCreateContentIdea } from "../application/create-content-idea";
import { makeAskBusinessBrain } from "../application/ask-business-brain";
import { makeBrainMemoryService } from "../application/brain-memory";
import { PrismaAIConfigurationRepository } from "./ai-configuration.repository";
import { PrismaBrainMemoryRepository } from "./brain-memory.repository";
import { OpenAIProvider } from "./openai.provider";
import { makeWorkspaceContext } from "./workspace-context";

const aiConfigurationRepository = new PrismaAIConfigurationRepository();
const brainMemoryRepository = new PrismaBrainMemoryRepository();
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
  getOrganizationIdByStoreId: organizationQueries.getOrganizationIdByStoreId,
  consumeAIReply: organizationUsage.consumeAIReply,
  auditLogCommands: auditCommands,
});

export const updateAIConfiguration = makeUpdateAIConfiguration({
  repository: aiConfigurationRepository,
});

export const generateCaptions = makeGenerateCaptions({
  aiProvider,
  aiConfigurationRepository,
});

export const generateTrends = makeGenerateTrends({
  aiProvider,
  aiConfigurationRepository,
});

export const brainMemoryService = makeBrainMemoryService({ repository: brainMemoryRepository });

const workspaceContext = makeWorkspaceContext({
  organizations: organizationQueries,
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  notifications: notificationQueries,
});

const marketingMemory = {
  getMemory: updateMarketingMemory,
  getBrief: generateDailyBrief,
};

export const generatePostIdeas = makeGeneratePostIdeas({
  aiProvider,
  aiConfigurationRepository,
  marketingMemory,
  dailyActions: {
    listPending: (organizationId, storeId) => dailyActionService.listPending(organizationId, storeId),
  },
  journeys: {
    listRecent: (organizationId, storeId, limit) => journeyService.listJourneys(organizationId, storeId, limit),
  },
});

export const analyzeCompetitor = makeAnalyzeCompetitor({
  aiProvider,
  aiConfigurationRepository,
});

export const askBusinessBrain = makeAskBusinessBrain({
  aiProvider,
  aiConfigurationRepository,
  workspaceContext,
  marketingMemory,
  businessBrainContext: businessBrainContextService,
  brainMemory: brainMemoryService,
});

export const analyzeMedia = makeAnalyzeMedia({ aiProvider, aiConfigurationRepository });
export const createContentIdea = makeCreateContentIdea({ aiProvider, aiConfigurationRepository });

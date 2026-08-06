import { eventBus } from "@/shared/events";
import { crmQueries } from "@/modules/crm";
import {
  conversationCommands,
  conversationQueries,
} from "@/modules/conversations";
import { ecommerceQueries, generateCoupon } from "@/modules/ecommerce";
import { createAttributionLink } from "@/modules/attribution";
import { organizationQueries, organizationUsage } from "@/modules/workspaces";
import { notificationQueries } from "@/modules/notifications";
import { queryAnalytics } from "@/modules/analytics/server";
import { auditCommands } from "@/modules/users";
import { metaService } from "@/modules/meta/server";
import {
  getBestTimeToPostForStore,
  marketingInsightsRepository,
} from "@/modules/analytics/server";
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
import { makeChatAssistantService } from "../application/chat";
import { makeToolExecutor } from "../application/tool-executor";
import { env } from "@/shared/config";
import { PrismaAIConfigurationRepository } from "./ai-configuration.repository";
import { PrismaBrainMemoryRepository } from "./brain-memory.repository";
import { PrismaChatSessionRepository } from "./chat-session.repository";
import { OpenRouterProvider } from "./openrouter.provider";
import { PrismaTokenUsageRepository } from "./token-usage.repository";
import { makeWorkspaceContext } from "./workspace-context";

export const aiConfigurationRepository = new PrismaAIConfigurationRepository();
const brainMemoryRepository = new PrismaBrainMemoryRepository();
const tokenUsageRepository = new PrismaTokenUsageRepository();
export const chatSessionRepository = new PrismaChatSessionRepository();
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

/** Composition root for the ai module. */
export const aiQueries = {
  getConfiguration: (projectId: string) =>
    aiConfigurationRepository.getByStore(projectId),
  listTokenUsage: (limit?: number) => tokenUsageRepository.listRecent(limit),
  summarizeTokenUsageByDay: (options?: Parameters<
    typeof tokenUsageRepository.summarizeByDay
  >[0]) => tokenUsageRepository.summarizeByDay(options),
  summarizeTokenUsageTotal: (options?: Parameters<
    typeof tokenUsageRepository.summarizeTotal
  >[0]) => tokenUsageRepository.summarizeTotal(options),
};

export const generateWelcome = makeGenerateWelcome({
  aiProvider,
  aiConfigurationRepository,
});

export const toolExecutor = makeToolExecutor({
  generateCoupon,
  getCouponById: ecommerceQueries.getCouponById,
  getTodaySpend: async (projectId: string) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const coupons = await ecommerceQueries.listCoupons(projectId, { limit: 1000 });
    return coupons
      .filter((c) => c.createdAt >= startOfDay)
      .reduce((sum, c) => sum + c.discountPct, 0);
  },
  createAttributionLink,
  sendMessage: metaService.sendMessage.bind(metaService),
  queryAnalytics,
});

export const chatAssistant = makeChatAssistantService({
  sessions: chatSessionRepository,
  aiProvider,
  toolExecutor,
});

export const generateReply = makeGenerateReply({
  aiProvider,
  contentModerator: aiProvider,
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
  getBestTimeToPostForStore,
  listMediaPosts: (projectId) => marketingInsightsRepository.listMediaPosts(projectId, { limit: 50 }),
  listOrders: (projectId, limit) => ecommerceQueries.listOrders(projectId, limit),
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
    listPending: (userId, projectId) => dailyActionService.listPending(userId, projectId),
  },
  journeys: {
    listRecent: (userId, projectId, limit) => journeyService.listJourneys(userId, projectId, limit),
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

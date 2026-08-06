/**
 * Acyclic AI services entry point.
 *
 * This module exports the AI provider, guard, and self-contained AI use-cases
 * without pulling in the cross-module composition root (`infrastructure/container.ts`).
 * Server-side consumers that only need the provider or a simple AI operation should
 * import from here to avoid circular initialization cycles with ecommerce, analytics,
 * and intelligence.
 */

import { aiProvider, tokenUsageRepository } from "./ai-provider";
import { aiUsageGuard } from "./application/usage-guard";
import { PrismaAIConfigurationRepository } from "./infrastructure/ai-configuration.repository";
import { makeGenerateCaptions } from "./application/generate-captions";
import { makeGenerateWelcome } from "./application/generate-welcome";
import { makeAnalyzeCompetitor } from "./application/analyze-competitor";
import { makeAnalyzeMedia } from "./application/analyze-media";
import { makeAnalyzeTrendingReels } from "./application/analyze-trending-reels";
import { makeCreateContentIdea } from "./application/create-content-idea";
import { resolveOperation } from "./application/operation-resolver";
import { generateDashboard } from "./application/generate-dashboard";

export const aiConfigurationRepository = new PrismaAIConfigurationRepository();

export { aiProvider, tokenUsageRepository, aiUsageGuard };

export const generateCaptions = makeGenerateCaptions({
  aiProvider,
  aiConfigurationRepository,
});

export const generateWelcome = makeGenerateWelcome({
  aiProvider,
  aiConfigurationRepository,
});

export const analyzeCompetitor = makeAnalyzeCompetitor({
  aiProvider,
  aiConfigurationRepository,
});

export const analyzeMedia = makeAnalyzeMedia({
  aiProvider,
  aiConfigurationRepository,
});

export const analyzeTrendingReels = makeAnalyzeTrendingReels({
  aiProvider,
  aiConfigurationRepository,
});

export const createContentIdea = makeCreateContentIdea({
  aiProvider,
  aiConfigurationRepository,
});

export { resolveOperation, generateDashboard };

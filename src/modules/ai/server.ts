/**
 * Server-only AI module barrel.
 *
 * Exports the wired application services / composition root. Client code should
 * use `@/modules/ai` (types + actions) instead.
 */
export {
  aiQueries,
  aiProvider,
  generateCaptions,
  generateTrends,
  generatePostIdeas,
  analyzeCompetitor,
  analyzeMedia,
  createContentIdea,
  generateReply,
  generateWelcome,
  updateAIConfiguration,
  askBusinessBrain,
  brainMemoryService,
} from "./infrastructure/container";

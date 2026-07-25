/**
 * Server-only AI module barrel.
 *
 * Exports the wired application services / composition root. Client code should
 * use `@/modules/ai` (types + actions) instead.
 */
export {
  aiQueries,
  generateCaptions,
  generateTrends,
  generatePostIdeas,
  generateReply,
  generateWelcome,
  updateAIConfiguration,
} from "./infrastructure/container";

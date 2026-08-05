import { logger } from "@/shared/observability";
import type { AIProvider, AIMessage } from "@/modules/ai/server";
import type { MentionSentiment, MentionSentimentAnalyzer } from "../application/mention-service";
import { MENTION_SENTIMENTS } from "../application/mention-service";
import { heuristicMentionSentimentAnalyzer } from "./heuristic-mention-analyzer";

interface OpenRouterMentionSentimentAnalyzerDeps {
  aiProvider: AIProvider;
}

function isMentionSentiment(value: string): value is MentionSentiment {
  return MENTION_SENTIMENTS.some((sentiment) => sentiment === value);
}

export function makeOpenRouterMentionSentimentAnalyzer(
  deps: OpenRouterMentionSentimentAnalyzerDeps,
): MentionSentimentAnalyzer {
  return {
    async analyze(caption) {
      const text = caption ?? "";
      const messages: AIMessage[] = [
        {
          role: "system",
          content:
            "You classify social media brand mentions by sentiment. Reply with exactly one uppercase word: POSITIVE, NEGATIVE, NEUTRAL, or MIXED. No explanation.",
        },
        { role: "user", content: `Mention caption: "${text}"` },
      ];

      try {
        const raw = await deps.aiProvider.complete(messages, {
          model: "openai/gpt-4o-mini",
          operation: "mention-sentiment",
        });
        const normalized = raw.trim().toUpperCase().replace(/[^A-Z]/g, "");
        if (isMentionSentiment(normalized)) {
          return { sentiment: normalized, confidence: 0.85, summary: "AI sentiment analysis" };
        }
      } catch (error) {
        logger.warn("social.mentionSentiment.openRouterFailed", {
          error: error instanceof Error ? error.message : "unknown",
        });
      }

      return heuristicMentionSentimentAnalyzer.analyze(caption);
    },
  };
}

import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import type { AIMessage, AIProvider } from "../application/ports";

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";

const DEFAULT_REPLY =
  "Hello! I'm your AI assistant. How can I help you today?";

interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

function isOpenAIResponse(value: unknown): value is OpenAIResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "choices" in value &&
    Array.isArray((value as OpenAIResponse).choices) &&
    (value as OpenAIResponse).choices.length > 0 &&
    typeof (value as OpenAIResponse).choices[0]?.message?.content === "string"
  );
}

function buildDevReply(messages: AIMessage[]): string {
  const last = messages.at(-1)?.content.toLowerCase() ?? "";
  if (
    last.includes("human") ||
    last.includes("agent") ||
    last.includes("representative")
  ) {
    return "[ESCALATE] I'm connecting you with a human agent.";
  }
  return "Thanks for your message! This is a dev reply because OPENAI_API_KEY is not set.";
}

export class OpenAIProvider implements AIProvider {
  async complete(
    messages: AIMessage[],
    config: { model: string; fallback?: string },
  ): Promise<string> {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.info("ai.openai.skipped", { reason: "no-api-key" });
      return config.fallback ?? buildDevReply(messages);
    }

    try {
      const res = await fetch(OPENAI_API_BASE, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        logger.warn("ai.openai.apiError", { status: res.status });
        return DEFAULT_REPLY;
      }

      const payload: unknown = await res.json();
      if (!isOpenAIResponse(payload)) {
        logger.warn("ai.openai.unexpectedResponse");
        return DEFAULT_REPLY;
      }

      return payload.choices[0].message.content.trim();
    } catch (error) {
      logger.error("ai.openai.requestFailed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return DEFAULT_REPLY;
    }
  }
}

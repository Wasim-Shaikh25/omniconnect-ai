import { logger } from "@/shared/observability";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface OpenRouterToolFunction {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface OpenRouterTool {
  type: "function";
  function: OpenRouterToolFunction;
}

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface OpenRouterResponseFormat {
  type: "json_object" | "json_schema";
  json_schema?: {
    name: string;
    schema?: Record<string, unknown>;
    strict?: boolean;
  };
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost?: number;
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: OpenRouterToolCall[];
    refusal?: string | null;
  };
  finish_reason: string | null;
}

export interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
  model?: string;
}

export interface OpenRouterChatInput {
  model?: string;
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  response_format?: OpenRouterResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface OpenRouterConfig {
  apiKey: string;
  siteUrl?: string;
  siteName?: string;
  defaultModel?: string;
}

export interface TrackedUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export type UsageTracker = (usage: TrackedUsage) => void | Promise<void>;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 30000;

export class OpenRouterClient {
  private readonly baseUrl: string;

  constructor(
    private readonly config: OpenRouterConfig,
    private readonly trackUsage?: UsageTracker,
    baseUrl?: string,
  ) {
    this.baseUrl = baseUrl ?? OPENROUTER_BASE_URL;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.config.siteUrl) {
      headers["HTTP-Referer"] = this.config.siteUrl;
    }

    headers["X-Title"] = this.config.siteName ?? "OmniConnect AI";

    return headers;
  }

  async chat(input: OpenRouterChatInput): Promise<OpenRouterResponse> {
    const model = input.model ?? this.config.defaultModel ?? "openai/gpt-4o-mini";

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model,
        messages: input.messages,
        tools: input.tools,
        response_format: input.response_format,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens,
        top_p: input.top_p,
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      logger.warn("openrouter.apiError", { status: response.status, body: text.slice(0, 500) });
      throw new Error(`OpenRouter request failed: ${response.status} ${text.slice(0, 200)}`);
    }

    const data: unknown = await response.json();
    const parsed = parseOpenRouterResponse(data);

    if (parsed.usage) {
      await this.trackUsageImpl(parsed.usage, model);
    }

    return parsed;
  }

  async *streamChat(input: OpenRouterChatInput): AsyncGenerator<string, OpenRouterResponse, unknown> {
    const model = input.model ?? this.config.defaultModel ?? "openai/gpt-4o-mini";

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model,
        messages: input.messages,
        tools: input.tools,
        response_format: input.response_format,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens,
        top_p: input.top_p,
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      logger.warn("openrouter.streamError", { status: response.status, body: text.slice(0, 500) });
      throw new Error(`OpenRouter stream failed: ${response.status} ${text.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error("OpenRouter stream response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finishResponse: OpenRouterResponse | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice("data: ".length).trim();
          if (payload === "[DONE]") continue;

          try {
            const parsed: unknown = JSON.parse(payload);
            const delta = parseStreamChunk(parsed);
            if (delta.content) {
              yield delta.content;
            }
            if (delta.finishResponse) {
              finishResponse = delta.finishResponse;
            }
          } catch {
            logger.warn("openrouter.streamParseError", { payload });
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (finishResponse?.usage) {
      await this.trackUsageImpl(finishResponse.usage, model);
    }

    return finishResponse ?? { id: "", choices: [], model };
  }

  private async trackUsageImpl(usage: OpenRouterUsage, model: string): Promise<void> {
    if (!this.trackUsage) return;

    const tracked: TrackedUsage = {
      model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost: usage.total_cost,
    };

    try {
      await this.trackUsage(tracked);
    } catch (error) {
      logger.warn("openrouter.trackUsageFailed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}

function parseOpenRouterResponse(value: unknown): OpenRouterResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("OpenRouter response is not an object");
  }

  const obj = value as Record<string, unknown>;
  const choices = Array.isArray(obj.choices) ? obj.choices : [];

  return {
    id: typeof obj.id === "string" ? obj.id : "",
    choices: choices.map((choice: unknown, index: number) => parseChoice(choice, index)),
    usage: parseUsage(obj.usage),
    model: typeof obj.model === "string" ? obj.model : undefined,
  };
}

function parseChoice(value: unknown, index: number): OpenRouterChoice {
  if (typeof value !== "object" || value === null) {
    return { index, message: { role: "assistant", content: "" }, finish_reason: null };
  }

  const obj = value as Record<string, unknown>;
  const messageObj =
    typeof obj.message === "object" && obj.message !== null
      ? (obj.message as Record<string, unknown>)
      : {};

  const toolCalls = Array.isArray(messageObj.tool_calls)
    ? messageObj.tool_calls.map(parseToolCall).filter((t): t is OpenRouterToolCall => t !== null)
    : undefined;

  return {
    index: typeof obj.index === "number" ? obj.index : index,
    message: {
      role: typeof messageObj.role === "string" ? messageObj.role : "assistant",
      content: typeof messageObj.content === "string" ? messageObj.content : null,
      tool_calls: toolCalls,
      refusal: messageObj.refusal === null || typeof messageObj.refusal === "string" ? messageObj.refusal : null,
    },
    finish_reason: typeof obj.finish_reason === "string" ? obj.finish_reason : null,
  };
}

function parseToolCall(value: unknown): OpenRouterToolCall | null {
  if (typeof value !== "object" || value === null) return null;

  const obj = value as Record<string, unknown>;
  const fn =
    typeof obj.function === "object" && obj.function !== null
      ? (obj.function as Record<string, unknown>)
      : {};

  return {
    id: typeof obj.id === "string" ? obj.id : "",
    type: typeof obj.type === "string" ? (obj.type as "function") : "function",
    function: {
      name: typeof fn.name === "string" ? fn.name : "",
      arguments: typeof fn.arguments === "string" ? fn.arguments : "",
    },
  };
}

function parseUsage(value: unknown): OpenRouterUsage | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const obj = value as Record<string, unknown>;
  return {
    prompt_tokens: typeof obj.prompt_tokens === "number" ? obj.prompt_tokens : 0,
    completion_tokens: typeof obj.completion_tokens === "number" ? obj.completion_tokens : 0,
    total_tokens: typeof obj.total_tokens === "number" ? obj.total_tokens : 0,
    total_cost: typeof obj.total_cost === "number" ? obj.total_cost : undefined,
  };
}

function parseStreamChunk(value: unknown): {
  content: string;
  finishResponse: OpenRouterResponse | null;
} {
  const parsed = parseOpenRouterResponse(value);

  if (parsed.choices.length === 0) {
    return { content: "", finishResponse: parsed.usage ? parsed : null };
  }

  const delta = parsed.choices[0]!.message;
  const content = typeof delta.content === "string" ? delta.content : "";

  // When finish_reason is present, the chunk usually carries the final usage.
  const isFinished = parsed.choices[0]!.finish_reason !== null;
  const finishResponse = isFinished || parsed.usage ? parsed : null;

  return { content, finishResponse };
}

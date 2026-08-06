import type {
  AICompletionConfig,
  AICompletionResult,
  AIConfigurationRecord,
  AIMessage,
  AIProvider,
  ChatMessageRecord,
  ChatSessionRecord,
  ChatSessionRepository,
} from "./ports";
import { buildSystemPrompt } from "./build-system-prompt";
import { AI_TOOLS } from "../domain/tools";
import type { AIToolName } from "../domain/tools";
import type { ToolCall, ToolExecutor } from "./tool-executor";

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 3;

export interface SendChatMessageInput {
  sessionId: string;
  projectId: string;
  userId: string;
  content: string;
  config: AIConfigurationRecord;
  brandName?: string;
}

export interface SendChatMessageResult {
  sessionId: string;
  message: ChatMessageRecord;
}

export interface ChatAssistantService {
  createSession(input: {
    projectId: string;
    userId: string;
    title?: string;
  }): Promise<ChatSessionRecord>;
  listSessions(projectId: string): Promise<ChatSessionRecord[]>;
  renameSession(sessionId: string, title: string): Promise<ChatSessionRecord | null>;
  deleteSession(sessionId: string, projectId: string): Promise<void>;
  getSession(sessionId: string): Promise<(ChatSessionRecord & { messages: ChatMessageRecord[] }) | null>;
  sendMessage(input: SendChatMessageInput): Promise<SendChatMessageResult>;
  streamMessage(input: SendChatMessageInput): AsyncIterable<string>;
  saveAssistantMessage(sessionId: string, content: string): Promise<ChatMessageRecord>;
}

export function makeChatAssistantService(deps: {
  sessions: ChatSessionRepository;
  aiProvider: AIProvider;
  toolExecutor: ToolExecutor;
}): ChatAssistantService {
  return {
    async createSession(input) {
      return deps.sessions.create(input);
    },

    async listSessions(projectId) {
      return deps.sessions.listByProject(projectId, 50);
    },

    async renameSession(sessionId, title) {
      return deps.sessions.updateTitle(sessionId, title);
    },

    async deleteSession(sessionId, projectId) {
      await deps.sessions.delete(sessionId, projectId);
    },

    async getSession(sessionId) {
      return deps.sessions.findById(sessionId);
    },

    async sendMessage(input) {
      const session = await deps.sessions.findById(input.sessionId);
      if (!session || session.projectId !== input.projectId || session.userId !== input.userId) {
        throw new Error("Chat session not found");
      }

      await deps.sessions.addMessage({
        sessionId: input.sessionId,
        role: "user",
        content: input.content,
        toolCalls: null,
        toolCallId: null,
      });

      const messages = buildChatMessages(input, session.messages);
      const completionConfig: AICompletionConfig = {
        model: input.config.model,
        operation: "chat",
        metadata: { projectId: input.projectId, userId: input.userId },
        tools: AI_TOOLS,
      };

      const finalText = await runToolLoop(
        deps.aiProvider,
        deps.toolExecutor,
        messages,
        completionConfig,
        input,
      );

      const message = await deps.sessions.addMessage({
        sessionId: input.sessionId,
        role: "assistant",
        content: finalText,
        toolCalls: null,
        toolCallId: null,
      });

      return { sessionId: input.sessionId, message };
    },

    async *streamMessage(input) {
      const session = await deps.sessions.findById(input.sessionId);
      if (!session || session.projectId !== input.projectId || session.userId !== input.userId) {
        throw new Error("Chat session not found");
      }

      await deps.sessions.addMessage({
        sessionId: input.sessionId,
        role: "user",
        content: input.content,
        toolCalls: null,
        toolCallId: null,
      });

      const messages = buildChatMessages(input, session.messages);
      const completionConfig: AICompletionConfig = {
        model: input.config.model,
        operation: "chat",
        metadata: { projectId: input.projectId, userId: input.userId },
      };

      const stream = deps.aiProvider.stream?.(messages, completionConfig);
      if (!stream) {
        const text = await deps.aiProvider.complete(messages, completionConfig);
        yield text;
        return;
      }

      for await (const chunk of stream) {
        yield chunk;
      }
    },

    async saveAssistantMessage(sessionId, content) {
      return deps.sessions.addMessage({
        sessionId,
        role: "assistant",
        content,
        toolCalls: null,
        toolCallId: null,
      });
    },
  };
}

async function runToolLoop(
  aiProvider: AIProvider,
  toolExecutor: ToolExecutor,
  messages: AIMessage[],
  config: AICompletionConfig,
  input: SendChatMessageInput,
): Promise<string> {
  const complete: (
    m: AIMessage[],
    c: AICompletionConfig,
  ) => Promise<AICompletionResult> =
    aiProvider.completeWithToolCalls?.bind(aiProvider) ??
    (async (m: AIMessage[], c: AICompletionConfig) => ({
      content: await aiProvider.complete(m, c),
    }));

  let iteration = 0;

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;
    const result = await complete(messages, config);

    if (!result.toolCalls || result.toolCalls.length === 0) {
      return result.content;
    }

    messages.push({
      role: "assistant",
      content: result.content || "",
      toolCalls: result.toolCalls.map((t) => ({
        id: t.id,
        type: t.type,
        function: { name: t.function.name, arguments: t.function.arguments },
      })),
    });

    for (const call of result.toolCalls) {
      const toolCall = parseToolCall(call);
      const toolResult = toolCall
        ? await toolExecutor.execute(toolCall, {
            projectId: input.projectId,
            userId: input.userId,
            config: input.config,
          })
        : { ok: false, error: "Invalid tool call from model." };

      messages.push({
        role: "tool",
        content: JSON.stringify(toolResult),
        toolCallId: call.id,
      });
    }
  }

  return "I'm still thinking; please ask me to continue.";
}

function parseToolCall(call: {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}): ToolCall | null {
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(call.function.arguments);
    args = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return null;
  }

  const name = call.function.name as AIToolName;
  const validNames: AIToolName[] = [
    "createCoupon",
    "injectCoupon",
    "sendMessage",
    "queryAnalytics",
    "generateDashboard",
  ];
  if (!validNames.includes(name)) {
    return null;
  }

  return { id: call.id, name, arguments: args };
}

function buildChatMessages(
  input: SendChatMessageInput,
  sessionMessages: ChatMessageRecord[],
): AIMessage[] {
  const history = sessionMessages.slice(-MAX_HISTORY);
  const systemPrompt = buildSystemPrompt(input.config, {
    brandName: input.brandName ?? "Your store",
  });

  return [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as AIMessage["role"],
      content: m.content,
      ...(m.toolCalls ? { toolCalls: m.toolCalls } : {}),
      ...(m.toolCallId ? { toolCallId: m.toolCallId } : {}),
    })),
    { role: "user", content: input.content },
  ];
}

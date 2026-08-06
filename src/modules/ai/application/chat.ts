import type {
  AICompletionConfig,
  AIConfigurationRecord,
  AIMessage,
  AIProvider,
  ChatMessageRecord,
  ChatSessionRecord,
  ChatSessionRepository,
} from "./ports";
import { buildSystemPrompt } from "./build-system-prompt";

const MAX_HISTORY = 20;

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
  deleteSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<(ChatSessionRecord & { messages: ChatMessageRecord[] }) | null>;
  sendMessage(input: SendChatMessageInput): Promise<SendChatMessageResult>;
  streamMessage(input: SendChatMessageInput): AsyncIterable<string>;
  saveAssistantMessage(sessionId: string, content: string): Promise<ChatMessageRecord>;
}

export function makeChatAssistantService(deps: {
  sessions: ChatSessionRepository;
  aiProvider: AIProvider;
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

    async deleteSession(sessionId) {
      await deps.sessions.delete(sessionId);
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
      };

      const text = await deps.aiProvider.complete(messages, completionConfig);

      const message = await deps.sessions.addMessage({
        sessionId: input.sessionId,
        role: "assistant",
        content: text,
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
    ...history.map((m) => ({ role: m.role as AIMessage["role"], content: m.content })),
    { role: "user", content: input.content },
  ];
}

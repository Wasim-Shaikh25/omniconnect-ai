import type {
  EnabledSkills,
  SalesRules,
  ChannelSettings,
  EscalationRules,
  ModelOverrides,
} from "../domain/ai-config";
import type { AIToolDefinition, AIToolCall } from "../domain/tools";

export interface AIConfigurationRecord {
  projectId: string;
  aiName: string | null;
  brandVoice: string | null;
  language: string;
  systemPrompt: string;
  tone: string | null;
  welcomeStrategy: string | null;
  couponStrategy: string | null;
  salesStrategy: string | null;
  enabledSkills: EnabledSkills;
  salesRules: SalesRules;
  channelSettings: ChannelSettings;
  escalationRules: EscalationRules;
  modelOverrides: ModelOverrides;
  knowledgeBase: string | null;
  productKnowledge: string | null;
  model: string;
}

export interface AIConfigurationRepository {
  getByStore(projectId: string): Promise<AIConfigurationRecord | null>;
  getOrCreateDefault(projectId: string): Promise<AIConfigurationRecord>;
  update(
    projectId: string,
    input: Partial<Omit<AIConfigurationRecord, "projectId">>,
  ): Promise<AIConfigurationRecord>;
}

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  toolCallId?: string;
}

export interface AICompletionConfig {
  model: string;
  fallback?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
  tools?: AIToolDefinition[];
}

export interface AICompletionResult {
  content: string;
  toolCalls?: AIToolCall[];
}

export interface AIProvider {
  complete(messages: AIMessage[], config: AICompletionConfig): Promise<string>;
  completeWithToolCalls?(
    messages: AIMessage[],
    config: AICompletionConfig,
  ): Promise<AICompletionResult>;
  stream?(messages: AIMessage[], config: AICompletionConfig): AsyncIterable<string>;
}

export interface TokenUsageRecord {
  id: string;
  userId: string;
  projectId: string | null;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number | null;
  createdAt: Date;
  user?: { email: string; name: string | null } | null;
  project?: { name: string } | null;
}

export interface TokenUsageRepository {
  create(input: {
    userId: string;
    projectId?: string | null;
    feature: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number | null;
  }): Promise<TokenUsageRecord>;

  listRecent(limit?: number): Promise<TokenUsageRecord[]>;

  summarizeByDay(options?: {
    start?: Date;
    end?: Date;
    userId?: string;
    projectId?: string;
  }): Promise<
    Array<{
      date: string;
      feature: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      requests: number;
      cost: number | null;
    }>
  >;

  summarizeTotal(options?: {
    start?: Date;
    end?: Date;
    userId?: string;
    projectId?: string;
  }): Promise<{
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  }>;
}

export interface AssistantService {
  generateReply(input: {
    conversationId: string;
    externalUserId: string;
  }): Promise<{
    text: string;
    escalate: boolean;
  }>;
}

export interface ChatSessionRecord {
  id: string;
  projectId: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls: AIToolCall[] | null;
  toolCallId: string | null;
  createdAt: Date;
}

export interface ChatSessionRepository {
  create(input: { projectId: string; userId: string; title?: string }): Promise<ChatSessionRecord>;
  findById(id: string): Promise<(ChatSessionRecord & { messages: ChatMessageRecord[] }) | null>;
  listByProject(projectId: string, limit?: number): Promise<ChatSessionRecord[]>;
  updateTitle(id: string, title: string): Promise<ChatSessionRecord | null>;
  delete(id: string): Promise<void>;
  addMessage(input: Omit<ChatMessageRecord, "id" | "createdAt">): Promise<ChatMessageRecord>;
}

export interface BrainConversationMemoryRecord {
  id: string;
  userId: string;
  projectId: string | null;
  question: string;
  answer: string;
  acceptedAdviceIds: string[];
  rejectedAdviceIds: string[];
  goals: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrainMemoryRepository {
  save(entry: Omit<BrainConversationMemoryRecord, "id" | "createdAt" | "updatedAt">): Promise<BrainConversationMemoryRecord>;
  listRecent(userId: string, projectId?: string, limit?: number): Promise<BrainConversationMemoryRecord[]>;
  updateFeedback(id: string, acceptedAdviceIds: string[], rejectedAdviceIds: string[], goals: string[]): Promise<BrainConversationMemoryRecord>;
  purgeExpiredBefore(before: Date): Promise<number>;
}

export interface AIConfigurationRecord {
  projectId: string;
  systemPrompt: string;
  tone: string | null;
  welcomeStrategy: string | null;
  couponStrategy: string | null;
  salesStrategy: string | null;
  escalationRules: string | null;
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
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  complete(
    messages: AIMessage[],
    config: { model: string; fallback?: string },
  ): Promise<string>;
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

export interface BrainConversationMemoryRecord {
  id: string;
  userId: string;
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
  listRecent(userId: string, userId: string, projectId?: string, limit?: number): Promise<BrainConversationMemoryRecord[]>;
  updateFeedback(id: string, acceptedAdviceIds: string[], rejectedAdviceIds: string[], goals: string[]): Promise<BrainConversationMemoryRecord>;
  purgeExpiredBefore(before: Date): Promise<number>;
}

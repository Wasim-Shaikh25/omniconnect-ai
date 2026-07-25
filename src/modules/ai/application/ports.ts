export interface AIConfigurationRecord {
  storeId: string;
  systemPrompt: string;
  tone: string | null;
  welcomeStrategy: string | null;
  couponStrategy: string | null;
  salesStrategy: string | null;
  escalationRules: string | null;
  model: string;
}

export interface AIConfigurationRepository {
  getByStore(storeId: string): Promise<AIConfigurationRecord | null>;
  getOrCreateDefault(storeId: string): Promise<AIConfigurationRecord>;
  update(
    storeId: string,
    input: Partial<Omit<AIConfigurationRecord, "storeId">>,
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
  organizationId: string;
  storeId: string | null;
  question: string;
  answer: string;
  acceptedAdviceIds: string[];
  rejectedAdviceIds: string[];
  goals: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BrainMemoryRepository {
  save(entry: Omit<BrainConversationMemoryRecord, "id" | "createdAt" | "updatedAt">): Promise<BrainConversationMemoryRecord>;
  listRecent(userId: string, organizationId: string, storeId?: string, limit?: number): Promise<BrainConversationMemoryRecord[]>;
  updateFeedback(id: string, acceptedAdviceIds: string[], rejectedAdviceIds: string[], goals: string[]): Promise<BrainConversationMemoryRecord>;
}

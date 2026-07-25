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
  complete(messages: AIMessage[], config: { model: string }): Promise<string>;
}

export interface AssistantService {
  generateReply(conversationId: string): Promise<{
    text: string;
    escalate: boolean;
  }>;
}

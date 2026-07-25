import type { BrainMemoryRepository, BrainConversationMemoryRecord } from "./ports";

export interface BrainMemoryServiceInput {
  repository: BrainMemoryRepository;
}

export function makeBrainMemoryService(input: BrainMemoryServiceInput) {
  return {
    async rememberQuestion(
      userId: string,
      organizationId: string,
      question: string,
      answer: string,
      storeId?: string,
    ): Promise<BrainConversationMemoryRecord> {
      return input.repository.save({
        userId,
        organizationId,
        storeId: storeId ?? null,
        question,
        answer,
        acceptedAdviceIds: [],
        rejectedAdviceIds: [],
        goals: [],
      });
    },

    async getRecentContext(
      userId: string,
      organizationId: string,
      storeId?: string,
      limit = 5,
    ): Promise<BrainConversationMemoryRecord[]> {
      return input.repository.listRecent(userId, organizationId, storeId, limit);
    },

    async recordFeedback(
      memoryId: string,
      acceptedAdviceIds: string[],
      rejectedAdviceIds: string[],
      goals: string[],
    ): Promise<BrainConversationMemoryRecord> {
      return input.repository.updateFeedback(memoryId, acceptedAdviceIds, rejectedAdviceIds, goals);
    },
  };
}

export type BrainMemoryService = ReturnType<typeof makeBrainMemoryService>;

import type { BrainMemoryRepository, BrainConversationMemoryRecord } from "./ports";

export interface BrainMemoryServiceInput {
  repository: BrainMemoryRepository;
  retentionDays?: number;
}

export function makeBrainMemoryService(input: BrainMemoryServiceInput) {
  const retentionDays = input.retentionDays ?? 90;

  function expirationDate(now = new Date()): Date {
    return new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  }

  return {
    async rememberQuestion(
      userId: string,
      _userId: string,
      question: string,
      answer: string,
      projectId?: string,
    ): Promise<BrainConversationMemoryRecord> {
      return input.repository.save({
        userId,
        projectId: projectId ?? null,
        question,
        answer,
        acceptedAdviceIds: [],
        rejectedAdviceIds: [],
        goals: [],
        expiresAt: expirationDate(),
      });
    },

    async getRecentContext(
      userId: string,
      projectId?: string,
      limit = 5,
    ): Promise<BrainConversationMemoryRecord[]> {
      return input.repository.listRecent(userId, projectId, limit);
    },

    async recordFeedback(
      memoryId: string,
      acceptedAdviceIds: string[],
      rejectedAdviceIds: string[],
      goals: string[],
    ): Promise<BrainConversationMemoryRecord> {
      return input.repository.updateFeedback(memoryId, acceptedAdviceIds, rejectedAdviceIds, goals);
    },

    async purgeExpired(now = new Date()): Promise<number> {
      return input.repository.purgeExpiredBefore(now);
    },

    get retentionDays(): number {
      return retentionDays;
    },
  };
}

export type BrainMemoryService = ReturnType<typeof makeBrainMemoryService>;

import type {
  ConversationRecord,
  ConversationRepository,
  MessageRecord,
  MessageRepository,
} from "./ports";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";

export interface ConversationDetail {
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export function makeConversationQueries(deps: {
  conversations: ConversationRepository;
  messages: MessageRepository;
}) {
  return {
    listConversations(
      projectId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string } = 50,
    ): Promise<ConversationRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.conversations.listByStore(projectId, options);
    },

    async listConversationsPaginated(
      projectId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<ConversationRecord>> {
      const [items, total] = await Promise.all([
        deps.conversations.listByStore(projectId, {
          ...pagination,
          offset: toSkip(pagination),
          search,
        }),
        deps.conversations.countByStore(projectId, { search }),
      ]);
      return paginatedResult(items, total, pagination);
    },

    countConversations(
      projectId: string,
      options?: { search?: string },
    ): Promise<number> {
      return deps.conversations.countByStore(projectId, options);
    },

    async getConversation(id: string): Promise<ConversationDetail | null> {
      const conversation = await deps.conversations.findById(id);
      if (!conversation) return null;
      const messages = await deps.messages.listByConversation(id);
      return { conversation, messages };
    },

    async findReplyByInReplyToMessageId(
      inReplyToMessageId: string,
    ): Promise<MessageRecord | null> {
      return deps.messages.findByInReplyToMessageId(inReplyToMessageId);
    },
  };
}

export type ConversationQueries = ReturnType<typeof makeConversationQueries>;

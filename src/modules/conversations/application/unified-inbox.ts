import type { SessionUser } from "@/modules/auth";
import type { ConversationChannel, ConversationRepository, MessageRepository, MessageSender } from "./ports";

export interface InboxItem {
  conversationId: string;
  storeId: string;
  storeName: string;
  channel: ConversationChannel;
  status: string;
  participantName: string | null;
  customerId: string | null;
  externalId: string | null;
  lastMessage: {
    content: string;
    sender: MessageSender;
    createdAt: Date;
  } | null;
  unread: boolean;
  updatedAt: Date;
}

export interface UnifiedInboxFilter {
  channel?: ConversationChannel;
  status?: string;
  search?: string;
}

export function makeGetUnifiedInbox(deps: {
  organizations: {
    getOrganizationOverview(
      organizationId: string,
      user?: SessionUser,
    ): Promise<{ id: string; name: string; stores: { id: string; name: string }[] } | null>;
  };
  customers: {
    listCustomers(storeId: string, limit?: number): Promise<{ id: string; username: string | null; storeId: string }[]>;
  };
  conversations: ConversationRepository;
  messages: MessageRepository;
}) {
  return async function getUnifiedInbox(
    user: SessionUser,
    filter?: UnifiedInboxFilter,
  ): Promise<InboxItem[]> {
    if (!user.organizationId) return [];
    const overview = await deps.organizations.getOrganizationOverview(
      user.organizationId,
      user,
    );
    if (!overview) return [];

    const stores = overview.stores;
    const storeIds = stores.map((s) => s.id);
    const storeNameById = new Map(stores.map((s) => [s.id, s.name]));

    if (storeIds.length === 0) return [];

    const [conversations, customerLists] = await Promise.all([
      deps.conversations.listByStoreIds(storeIds, 250),
      Promise.all(stores.map((s) => deps.customers.listCustomers(s.id, 100))),
    ]);

    const usernameByCustomerId = new Map<string, string | null>();
    for (const list of customerLists) {
      for (const c of list) {
        usernameByCustomerId.set(c.id, c.username);
      }
    }

    const conversationIds = conversations.map((c) => c.id);
    const latestByConversationId =
      await deps.messages.listLatestByConversationIds(conversationIds);

    const items: InboxItem[] = conversations.map((c) => {
      const lastMessage = latestByConversationId[c.id] ?? null;
      const unread =
        lastMessage !== null &&
        lastMessage.sender === "CUSTOMER" &&
        c.status !== "HUMAN_ACTIVE";

      return {
        conversationId: c.id,
        storeId: c.storeId,
        storeName: storeNameById.get(c.storeId) ?? "Unknown",
        channel: c.channel,
        status: c.status,
        participantName:
          usernameByCustomerId.get(c.customerId ?? "") ?? c.externalId ?? null,
        customerId: c.customerId,
        externalId: c.externalId,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              sender: lastMessage.sender,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unread,
        updatedAt: c.updatedAt,
      };
    });

    const search = filter?.search?.trim().toLowerCase();
    return items.filter((item) => {
      if (filter?.channel && item.channel !== filter.channel) return false;
      if (filter?.status && item.status !== filter.status) return false;
      if (search) {
        const haystack = `${item.participantName ?? ""} ${item.lastMessage?.content ?? ""} ${item.storeName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  };
}

export type GetUnifiedInbox = ReturnType<typeof makeGetUnifiedInbox>;

import { crmQueries } from "@/modules/crm";
import { organizationQueries } from "@/modules/organizations";
import { makeConversationCommands } from "../application/commands";
import { makeConversationQueries } from "../application/queries";
import { makeDetectConversationInsights } from "../application/detect-insights";
import { makeGetUnifiedInbox } from "../application/unified-inbox";
import { PrismaConversationRepository } from "./conversation.repository";
import { PrismaMessageRepository } from "./message.repository";

const conversations = new PrismaConversationRepository();
const messages = new PrismaMessageRepository();

/** Composition root for the conversations module. */
export const conversationQueries = makeConversationQueries({
  conversations,
  messages,
});
export const detectConversationInsights = makeDetectConversationInsights({ conversations: conversationQueries });

export const unifiedInboxQueries = makeGetUnifiedInbox({
  organizations: organizationQueries,
  customers: crmQueries,
  conversations,
  messages,
});

export const conversationCommands = makeConversationCommands({
  conversations,
  messages,
});

import { makeConversationCommands } from "../application/commands";
import { makeConversationQueries } from "../application/queries";
import { PrismaConversationRepository } from "./conversation.repository";
import { PrismaMessageRepository } from "./message.repository";

const conversations = new PrismaConversationRepository();
const messages = new PrismaMessageRepository();

/** Composition root for the conversations module. */
export const conversationQueries = makeConversationQueries({
  conversations,
  messages,
});

export const conversationCommands = makeConversationCommands({
  conversations,
  messages,
});

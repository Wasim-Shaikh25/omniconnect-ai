/**
 * Support module — public barrel.
 *
 * Owns SupportTicket and TicketComment tables. Exposes ticket creation,
 * listing, update, and comment use-cases/actions.
 */
export const MODULE_NAME = "support" as const;

export type {
  SupportTicketRecord,
  TicketCommentRecord,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "./application/ports";

export {
  createTicketAction,
  listMyTicketsAction,
  listAllTicketsAction,
  updateTicketAction,
  addTicketCommentAction,
  getTicketByIdAction,
} from "./presentation/actions";
export type { TicketActionState } from "./presentation/actions";

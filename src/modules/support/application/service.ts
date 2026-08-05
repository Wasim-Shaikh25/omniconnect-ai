import { z } from "zod";
import type { PaginationInput } from "@/shared/kernel";
import type { SupportTicketRecord, SupportTicketRepository, TicketCategory, TicketPriority, TicketStatus } from "./ports";

export const createTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(["BILLING", "TECHNICAL", "FEATURE_REQUEST", "OTHER"]),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export function makeCreateTicket(deps: { tickets: SupportTicketRepository }) {
  return async function createTicket(
    input: CreateTicketInput,
    userId: string,
    userId: string,
  ): Promise<SupportTicketRecord> {
    return deps.tickets.create({
      ...input,
      userId,
      userId,
    });
  };
}

export function makeListUserTickets(deps: { tickets: SupportTicketRepository }) {
  return async function listUserTickets(
    userId: string,
    userId?: string,
  ): Promise<SupportTicketRecord[]> {
    return deps.tickets.listByUser(userId, userId);
  };
}

export function makeListAllTickets(deps: { tickets: SupportTicketRepository }) {
  return async function listAllTickets(
    userId?: string | null,
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
    },
    pagination?: PaginationInput,
  ) {
    return deps.tickets.listAll(userId, filters, pagination);
  };
}

export function makeUpdateTicket(deps: { tickets: SupportTicketRepository }) {
  return async function updateTicket(
    id: string,
    userId: string,
    input: Partial<{ status: TicketStatus; priority: TicketPriority; assignedTo: string | null }>,
  ): Promise<SupportTicketRecord | null> {
    return deps.tickets.update(id, userId, input);
  };
}

export function makeAddTicketComment(deps: { tickets: SupportTicketRepository }) {
  return async function addTicketComment(
    ticketId: string,
    userId: string,
    userId: string,
    message: string,
    isInternal: boolean,
  ) {
    return deps.tickets.addComment({ ticketId, userId, userId, message, isInternal });
  };
}

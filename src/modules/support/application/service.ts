import { z } from "zod";
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
    organizationId: string,
    userId: string,
  ): Promise<SupportTicketRecord> {
    return deps.tickets.create({
      ...input,
      organizationId,
      userId,
    });
  };
}

export function makeListUserTickets(deps: { tickets: SupportTicketRepository }) {
  return async function listUserTickets(
    userId: string,
    organizationId?: string,
  ): Promise<SupportTicketRecord[]> {
    return deps.tickets.listByUser(userId, organizationId);
  };
}

export function makeListAllTickets(deps: { tickets: SupportTicketRepository }) {
  return async function listAllTickets(
    organizationId?: string | null,
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
    },
  ): Promise<SupportTicketRecord[]> {
    return deps.tickets.listAll(organizationId, filters);
  };
}

export function makeUpdateTicket(deps: { tickets: SupportTicketRepository }) {
  return async function updateTicket(
    id: string,
    organizationId: string,
    input: Partial<{ status: TicketStatus; priority: TicketPriority; assignedTo: string | null }>,
  ): Promise<SupportTicketRecord | null> {
    return deps.tickets.update(id, organizationId, input);
  };
}

export function makeAddTicketComment(deps: { tickets: SupportTicketRepository }) {
  return async function addTicketComment(
    ticketId: string,
    organizationId: string,
    userId: string,
    message: string,
    isInternal: boolean,
  ) {
    return deps.tickets.addComment({ ticketId, organizationId, userId, message, isInternal });
  };
}

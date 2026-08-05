"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireSuperAdmin } from "@/modules/auth";
import { auditCommands, getUserProfile } from "@/modules/users";
import { PrismaSupportTicketRepository } from "../infrastructure/repository";
import {
  createTicketSchema,
  makeCreateTicket,
  makeListUserTickets,
  makeListAllTickets,
  makeUpdateTicket,
  makeAddTicketComment,
} from "../application/service";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SupportTicketRecord,
  TicketCommentRecord,
} from "../application/ports";

const ticketRepository = new PrismaSupportTicketRepository();
const createTicket = makeCreateTicket({ tickets: ticketRepository });
const listUserTickets = makeListUserTickets({ tickets: ticketRepository });
const listAllTickets = makeListAllTickets({ tickets: ticketRepository });
const updateTicket = makeUpdateTicket({ tickets: ticketRepository });
const addTicketComment = makeAddTicketComment({ tickets: ticketRepository });

export interface TicketActionState {
  error?: string;
  ok?: boolean;
  ticketId?: string;
}

export async function createTicketAction(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const user = await requireUser();
  if (!user.userId) return { error: "No organization" };

  const parsed = createTicketSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ticket = await createTicket(parsed.data, user.userId, user.id);
  revalidatePath("/support");
  return { ok: true, ticketId: ticket.id };
}

export async function listMyTicketsAction() {
  const user = await requireUser();
  return listUserTickets(user.id, user.userId ?? undefined);
}

const DEFAULT_PAGE_LIMIT = 20;

function parsePage(raw: string | number | undefined) {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseLimit(raw: string | number | undefined) {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : DEFAULT_PAGE_LIMIT;
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : DEFAULT_PAGE_LIMIT;
}

export async function listAllTicketsAction(
  filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
  },
  page?: string | number,
  limit?: string | number,
) {
  await requireSuperAdmin();
  return listAllTickets(null, filters, {
    page: parsePage(page),
    limit: parseLimit(limit),
  });
}

export async function updateTicketAction(
  _prev: { error?: string; ok?: boolean; ticket?: SupportTicketRecord },
  formData: FormData,
) {
  const admin = await requireSuperAdmin();
  const ticketId = formData.get("ticketId");
  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket ID is required" };

  const existing = await ticketRepository.findById(ticketId);
  if (!existing) return { error: "Ticket not found" };

  const input: Partial<{ status: TicketStatus; priority: TicketPriority; assignedTo: string | null }> = {};
  const status = formData.get("status");
  const priority = formData.get("priority");
  const assignedTo = formData.get("assignedTo");
  if (typeof status === "string" && status) input.status = status as TicketStatus;
  if (typeof priority === "string" && priority) input.priority = priority as TicketPriority;
  if (typeof assignedTo === "string" && assignedTo) {
    const assignee = await getUserProfile(assignedTo);
    if (!assignee) return { error: "Assignee not found" };
    if (existing.userId && assignee.userId !== existing.userId) {
      return { error: "Assignee does not belong to this organization" };
    }
    input.assignedTo = assignedTo;
  }

  const ticket = await updateTicket(ticketId, existing.userId, input);
  if (!ticket) return { error: "Ticket not found" };

  await auditCommands.create({
    userId: existing.userId,
    actorId: admin.id,
    actorEmail: admin.email,
    action: "SUPPORT_TICKET_UPDATED",
    resource: "SupportTicket",
    resourceId: ticketId,
    details: JSON.stringify(input),
  });

  revalidatePath("/admin/tickets");
  revalidatePath("/support");
  return { ok: true, ticket };
}

export async function addTicketCommentAction(
  _prev: { error?: string; ok?: boolean; comment?: TicketCommentRecord },
  formData: FormData,
) {
  const user = await requireUser();
  const ticketId = formData.get("ticketId");
  const message = formData.get("message");
  const isInternal = formData.get("isInternal") === "on";
  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket ID is required" };
  if (typeof message !== "string" || !message) return { error: "Message is required" };

  const admin = user.isSuperAdmin ? user : null;
  if (isInternal && !admin) return { error: "Forbidden" };

  const ticket = await ticketRepository.findById(ticketId, user.userId ?? undefined);
  if (!ticket || (!user.isSuperAdmin && ticket.userId !== user.id)) return { error: "Ticket not found" };

  const comment = await addTicketComment(ticketId, ticket.userId, user.id, message, isInternal);
  revalidatePath("/admin/tickets");
  revalidatePath("/support");
  return { ok: true, comment };
}

export async function getTicketByIdAction(ticketId: string) {
  const user = await requireUser();
  const ticket = await ticketRepository.findById(ticketId, user.userId ?? undefined);
  if (!ticket) return null;
  if (!user.isSuperAdmin && ticket.userId !== user.id) return null;
  return ticket;
}

import { prisma } from "@/shared/database";
import type { PaginationInput } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";
import type {
  SupportTicketRecord,
  SupportTicketRepository,
  TicketCategory,
  TicketCommentRecord,
  TicketPriority,
  TicketStatus,
} from "../application/ports";

export class PrismaSupportTicketRepository implements SupportTicketRepository {
  async create(input: {
    userId: string;
    userId: string;
    title: string;
    description: string;
    category: TicketCategory;
  }): Promise<SupportTicketRecord> {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: input.userId,
        userId: input.userId,
        title: input.title,
        description: input.description,
        category: input.category,
      },
      include: { user: true, comments: { include: { user: true } } },
    });
    return this.mapTicket(ticket);
  }

  async findById(
    id: string,
    userId?: string,
  ): Promise<SupportTicketRecord | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: userId ? { id, userId } : { id },
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return ticket ? this.mapTicket(ticket) : null;
  }

  async listByUser(
    userId: string,
    userId?: string,
    limit = 1000,
  ): Promise<SupportTicketRecord[]> {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId, ...(userId ? { userId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" }, take: 100 } },
    });
    return tickets.map((t) => this.mapTicket(t));
  }

  async listAll(
    userId?: string | null,
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
    },
    pagination?: PaginationInput,
  ) {
    const where = {
      ...(userId ? { userId } : {}),
      ...filters,
    };
    const effectivePagination = pagination ?? { page: 1, limit: 100 };
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: toSkip(effectivePagination),
        take: effectivePagination.limit,
        include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" }, take: 100 } },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    return paginatedResult(
      tickets.map((t) => this.mapTicket(t)),
      total,
      effectivePagination,
    );
  }

  async update(
    id: string,
    userId: string,
    input: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assignedTo: string | null;
    }>,
  ): Promise<SupportTicketRecord | null> {
    const ticket = await prisma.supportTicket.update({
      where: { id, userId },
      data: input,
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return ticket ? this.mapTicket(ticket) : null;
  }

  async addComment(input: {
    ticketId: string;
    userId: string;
    userId: string;
    message: string;
    isInternal: boolean;
  }): Promise<TicketCommentRecord> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId, userId: input.userId },
    });
    if (!ticket) throw new Error("Ticket not found");

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: input.ticketId,
        userId: input.userId,
        message: input.message,
        isInternal: input.isInternal,
      },
      include: { user: true },
    });
    return this.mapComment(comment);
  }

  private mapTicket(t: {
    id: string;
    userId: string;
    userId: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    assignedTo: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: { email: string };
    comments: Array<{ id: string; ticketId: string; userId: string; message: string; isInternal: boolean; createdAt: Date; user: { email: string } }>;
  }): SupportTicketRecord {
    return {
      id: t.id,
      userId: t.userId,
      userId: t.userId,
      userEmail: t.user.email,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      assignedTo: t.assignedTo,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      comments: t.comments.map((c) => this.mapComment(c)),
    };
  }

  private mapComment(c: {
    id: string;
    ticketId: string;
    userId: string;
    message: string;
    isInternal: boolean;
    createdAt: Date;
    user: { email: string };
  }): TicketCommentRecord {
    return {
      id: c.id,
      ticketId: c.ticketId,
      userId: c.userId,
      userEmail: c.user.email,
      message: c.message,
      isInternal: c.isInternal,
      createdAt: c.createdAt,
    };
  }
}

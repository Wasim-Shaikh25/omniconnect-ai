import { prisma } from "@/shared/database";
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
    organizationId: string;
    userId: string;
    title: string;
    description: string;
    category: TicketCategory;
  }): Promise<SupportTicketRecord> {
    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        title: input.title,
        description: input.description,
        category: input.category,
      },
      include: { user: true, comments: { include: { user: true } } },
    });
    return this.mapTicket(ticket);
  }

  async findById(id: string): Promise<SupportTicketRecord | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return ticket ? this.mapTicket(ticket) : null;
  }

  async listByUser(userId: string): Promise<SupportTicketRecord[]> {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return tickets.map((t) => this.mapTicket(t));
  }

  async listAll(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
  }): Promise<SupportTicketRecord[]> {
    const tickets = await prisma.supportTicket.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return tickets.map((t) => this.mapTicket(t));
  }

  async update(
    id: string,
    input: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assignedTo: string | null;
    }>,
  ): Promise<SupportTicketRecord | null> {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: input,
      include: { user: true, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    return ticket ? this.mapTicket(ticket) : null;
  }

  async addComment(input: {
    ticketId: string;
    userId: string;
    message: string;
    isInternal: boolean;
  }): Promise<TicketCommentRecord> {
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
    organizationId: string;
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
      organizationId: t.organizationId,
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

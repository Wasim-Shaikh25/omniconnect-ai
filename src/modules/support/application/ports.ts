import type { PaginationInput, PaginatedResult } from "@/shared/kernel";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory = "BILLING" | "TECHNICAL" | "FEATURE_REQUEST" | "OTHER";

export interface TicketCommentRecord {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  message: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  comments: TicketCommentRecord[];
}

export interface SupportTicketRepository {
  create(input: {
    userId: string;
    userId: string;
    title: string;
    description: string;
    category: TicketCategory;
  }): Promise<SupportTicketRecord>;
  findById(id: string, userId?: string): Promise<SupportTicketRecord | null>;
  listByUser(userId: string, userId?: string, limit?: number): Promise<SupportTicketRecord[]>;
  listAll(
    userId?: string | null,
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
    },
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<SupportTicketRecord>>;
  update(
    id: string,
    userId: string,
    input: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assignedTo: string | null;
    }>,
  ): Promise<SupportTicketRecord | null>;
  addComment(input: {
    ticketId: string;
    userId: string;
    userId: string;
    message: string;
    isInternal: boolean;
  }): Promise<TicketCommentRecord>;
}

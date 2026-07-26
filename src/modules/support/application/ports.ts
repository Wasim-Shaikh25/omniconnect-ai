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
  organizationId: string;
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
    organizationId: string;
    userId: string;
    title: string;
    description: string;
    category: TicketCategory;
  }): Promise<SupportTicketRecord>;
  findById(id: string): Promise<SupportTicketRecord | null>;
  listByUser(userId: string): Promise<SupportTicketRecord[]>;
  listAll(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
  }): Promise<SupportTicketRecord[]>;
  update(
    id: string,
    input: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assignedTo: string | null;
    }>,
  ): Promise<SupportTicketRecord | null>;
  addComment(input: {
    ticketId: string;
    userId: string;
    message: string;
    isInternal: boolean;
  }): Promise<TicketCommentRecord>;
}

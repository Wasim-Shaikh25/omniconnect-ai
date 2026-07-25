export interface AuditLogRecord {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: Date;
}

export interface CreateAuditLogInput {
  organizationId: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

export interface AuditLogRepository {
  listByOrganization(organizationId: string, limit?: number): Promise<AuditLogRecord[]>;
  create(input: CreateAuditLogInput): Promise<AuditLogRecord>;
}

export interface AuditLogQueries {
  listByOrganization(organizationId: string, limit?: number): Promise<AuditLogRecord[]>;
}

export interface AuditLogCommands {
  create(input: CreateAuditLogInput): Promise<AuditLogRecord>;
}

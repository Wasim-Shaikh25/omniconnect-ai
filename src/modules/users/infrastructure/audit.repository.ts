import { prisma } from "@/shared/database";
import type {
  AuditLogRecord,
  AuditLogRepository,
  CreateAuditLogInput,
} from "../application/audit-ports";

function toRecord(row: {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: Date;
}): AuditLogRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId,
    details: row.details,
    createdAt: row.createdAt,
  };
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  async listByOrganization(
    organizationId: string,
    limit = 100,
  ): Promise<AuditLogRecord[]> {
    const rows = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    const row = await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        details: input.details ?? null,
      },
    });
    return toRecord(row);
  }
}

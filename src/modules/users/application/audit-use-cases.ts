import type {
  AuditLogCommands,
  AuditLogQueries,
  AuditLogRecord,
  AuditLogRepository,
  CreateAuditLogInput,
} from "./audit-ports";

export function makeListAuditLogs(deps: {
  auditLogs: AuditLogRepository;
}): AuditLogQueries["listByOrganization"] {
  return (userId, limit) =>
    deps.auditLogs.listByOrganization(userId, limit);
}

export function makeCreateAuditLog(deps: {
  auditLogs: AuditLogRepository;
}): AuditLogCommands["create"] {
  return (input: CreateAuditLogInput): Promise<AuditLogRecord> =>
    deps.auditLogs.create(input);
}

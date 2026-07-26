import { prisma } from "@/shared/database";
import { Prisma } from "@prisma/client";

type SystemLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface SystemLogRecord {
  id: string;
  level: SystemLogLevel;
  service: string;
  message: string;
  stackTrace: string | null;
  metadata: Record<string, unknown> | null;
  organizationId: string | null;
  userId: string | null;
  createdAt: Date;
}

export interface SystemLogFilter {
  level?: SystemLogLevel;
  service?: string;
  organizationId?: string;
  userId?: string;
  limit?: number;
}

export class PrismaSystemLogRepository {
  async create(input: {
    level: SystemLogLevel;
    service: string;
    message: string;
    stackTrace?: string;
    metadata?: Record<string, unknown>;
    organizationId?: string;
    userId?: string;
  }): Promise<SystemLogRecord> {
    const log = await prisma.systemLog.create({
      data: {
        level: input.level,
        service: input.service,
        message: input.message,
        stackTrace: input.stackTrace,
        metadata: input.metadata as Prisma.InputJsonValue,
        organizationId: input.organizationId,
        userId: input.userId,
      },
    });
    return log as SystemLogRecord;
  }

  async list(filter: SystemLogFilter = {}): Promise<SystemLogRecord[]> {
    const logs = await prisma.systemLog.findMany({
      where: {
        level: filter.level,
        service: filter.service ? { contains: filter.service } : undefined,
        organizationId: filter.organizationId,
        userId: filter.userId,
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit ?? 100,
    });
    return logs as SystemLogRecord[];
  }
}

const repo = new PrismaSystemLogRepository();

export async function logSystem(
  level: SystemLogLevel,
  service: string,
  message: string,
  fields: {
    stackTrace?: string;
    metadata?: Record<string, unknown>;
    organizationId?: string;
    userId?: string;
  } = {},
): Promise<void> {
  // Avoid logging secrets / tokens / PII in metadata.
  const safeMetadata = fields.metadata
    ? Object.fromEntries(
        Object.entries(fields.metadata).filter(
          ([key]) =>
            !["password", "token", "secret", "authorization", "apiKey"].some((banned) =>
              key.toLowerCase().includes(banned),
            ),
        ),
      )
    : undefined;

  try {
    await repo.create({
      level,
      service,
      message,
      stackTrace: fields.stackTrace,
      metadata: safeMetadata,
      organizationId: fields.organizationId,
      userId: fields.userId,
    });
  } catch (error) {
    // Fallback to console; do not throw from logger.
    console.error("Failed to persist system log", { error, level, service, message });
  }
}

export async function logSystemError(
  service: string,
  error: unknown,
  fields: {
    metadata?: Record<string, unknown>;
    organizationId?: string;
    userId?: string;
  } = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;
  await logSystem("ERROR", service, message, { ...fields, stackTrace });
}

export async function listSystemLogs(filter?: SystemLogFilter): Promise<SystemLogRecord[]> {
  return repo.list(filter);
}

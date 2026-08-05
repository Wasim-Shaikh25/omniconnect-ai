import { ExportRequestRecord, UserProfileRepository } from "./ports";

export interface UserDataExport {
  userId: string;
  exportedAt: string;
  user: Record<string, unknown>;
  organization: Record<string, unknown> | null;
  stores: unknown[];
  products: unknown[];
  coupons: unknown[];
  customers: unknown[];
  followers: unknown[];
  conversations: unknown[];
  notifications: unknown[];
  supportTickets: unknown[];
  auditLogs: unknown[];
  integrations: unknown[];
  brainMemory: unknown[];
}

export interface DataExportBuilder {
  build(userId: string): Promise<UserDataExport>;
}

export interface DataExportService {
  requestExport(userId: string): Promise<ExportRequestRecord>;
  getExport(userId: string): Promise<UserDataExport>;
  listExports(userId: string): Promise<ExportRequestRecord[]>;
}

export function makeDataExportService(deps: {
  users: UserProfileRepository;
  builder: DataExportBuilder;
}): DataExportService {
  return {
    async requestExport(userId) {
      const request = await deps.users.requestDataExport(userId);
      await deps.builder.build(userId);
      const downloadUrl = `/api/export/${request.id}`;
      const completed = await deps.users.markExportCompleted(request.id, downloadUrl);
      if (!completed) throw new Error("Failed to finalize export request");
      return completed;
    },
    async getExport(userId) {
      return deps.builder.build(userId);
    },
    async listExports(userId) {
      return deps.users.listExportRequests(userId);
    },
  };
}

import type { DashboardSchema } from "@/modules/ai";
import type { DashboardShareRepository } from "./ports";

export interface CreateDashboardShareInput {
  projectId: string;
  title?: string | null;
  schema: DashboardSchema;
  expiresAt?: Date | null;
}

export interface DashboardShareCommands {
  create(input: CreateDashboardShareInput): Promise<{ token: string; url: string }>;
}

export interface DashboardShareQueries {
  getByToken(token: string): Promise<{
    title: string | null;
    schema: DashboardSchema;
    expired: boolean;
  } | null>;
}

export function makeDashboardShareCommands(
  repository: DashboardShareRepository,
  appUrl: string,
): DashboardShareCommands {
  return {
    async create(input) {
      const token = generateToken();
      await repository.create({
        projectId: input.projectId,
        token,
        title: input.title,
        schema: input.schema,
        expiresAt: input.expiresAt,
      });
      const url = `${appUrl}/share/d/${token}`;
      return { token, url };
    },
  };
}

export function makeDashboardShareQueries(repository: DashboardShareRepository): DashboardShareQueries {
  return {
    async getByToken(token) {
      const row = await repository.findByToken(token);
      if (!row) return null;
      const expired = row.expiresAt ? new Date() > row.expiresAt : false;
      return { title: row.title, schema: row.schema, expired };
    },
  };
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

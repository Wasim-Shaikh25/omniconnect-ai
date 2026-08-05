"use server";

import { z } from "zod";
import { requireStoreAccess } from "@/modules/workspaces";
import { dashboardSchema, type DashboardSchema } from "@/modules/ai";
import { dashboardShareCommands, dashboardShareQueries } from "../server";

const projectIdSchema = z.string().min(1);

export interface CreateDashboardShareState {
  ok?: boolean;
  url?: string;
  error?: string;
}

export async function createDashboardShareAction(
  projectId: string,
  title: string | null,
  schema: DashboardSchema,
): Promise<CreateDashboardShareState> {
  const parsedProjectId = projectIdSchema.safeParse(projectId);
  if (!parsedProjectId.success) {
    return { error: parsedProjectId.error.issues[0]?.message ?? "Invalid input" };
  }

  const parsedSchema = dashboardSchema.safeParse(schema);
  if (!parsedSchema.success) {
    return { error: "Invalid dashboard schema." };
  }

  try {
    await requireStoreAccess(parsedProjectId.data);
    const result = await dashboardShareCommands.create({
      projectId: parsedProjectId.data,
      title,
      schema: parsedSchema.data,
      expiresAt: null,
    });
    return { ok: true, url: result.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Share failed" };
  }
}

export interface GetDashboardShareState {
  title: string | null;
  schema: DashboardSchema | null;
  expired: boolean;
  error?: string;
}

export async function getDashboardShareByTokenAction(token: string): Promise<GetDashboardShareState> {
  const parsed = z.string().min(1).safeParse(token);
  if (!parsed.success) {
    return { title: null, schema: null, expired: false, error: "Invalid token" };
  }

  try {
    const result = await dashboardShareQueries.getByToken(parsed.data);
    if (!result) {
      return { title: null, schema: null, expired: false, error: "Share not found" };
    }
    if (result.expired) {
      return { title: null, schema: null, expired: true, error: "Share expired" };
    }
    return { title: result.title, schema: result.schema, expired: false };
  } catch (error) {
    return { title: null, schema: null, expired: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

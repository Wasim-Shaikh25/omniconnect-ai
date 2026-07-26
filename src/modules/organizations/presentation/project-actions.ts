"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/modules/auth";
import {
  createProject,
  listProjects,
  archiveProject,
  projects,
} from "../infrastructure/container";
import type { ProjectMemberRole } from "../application/ports";
import { createProjectSchema } from "../application/project";

export interface ProjectActionState {
  error?: string;
  ok?: boolean;
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { error: "No workspace is linked to your account." };
  }

  const parsed = createProjectSchema.safeParse({
    organizationId: user.organizationId,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    instagramHandle: formData.get("instagramHandle") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createProject(parsed.data);
    if (!result.ok) return { error: result.error.message };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }

  revalidatePath("/projects");
  return { ok: true };
}

export async function listProjectsAction() {
  const user = await requireUser();
  if (!user.organizationId) return [];
  return listProjects(user.organizationId);
}

const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

export async function getProjectAction(projectId: string) {
  const user = await requireUser();
  if (!user.organizationId) return null;
  const all = await listProjects(user.organizationId);
  const project = all.find((p) => p.id === projectId);
  if (!project) return null;
  const members = await projects.listMembers(projectId);
  return { project, members };
}

export async function archiveProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireUser();
  const parsed = projectIdSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return { error: "Invalid project." };

  const existing = await listProjectsAction();
  const owned = existing.some((p) => p.id === parsed.data.projectId);
  if (!owned) return { error: "You do not have permission to archive this project." };

  await archiveProject(parsed.data.projectId);
  revalidatePath("/projects");
  return { ok: true };
}

const addMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
});

export async function addProjectMemberAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireUser();
  const parsed = addMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await listProjectsAction();
  const owned = existing.some((p) => p.id === parsed.data.projectId);
  if (!owned) return { error: "Project not found." };

  await projects.addMember({
    projectId: parsed.data.projectId,
    userId: parsed.data.userId,
    role: parsed.data.role as ProjectMemberRole,
  });
  revalidatePath("/projects");
  return { ok: true };
}

const removeMemberSchema = z.object({
  memberId: z.string().min(1),
});

export async function removeProjectMemberAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireUser();
  const parsed = removeMemberSchema.safeParse({
    memberId: formData.get("memberId"),
  });
  if (!parsed.success) return { error: "Invalid member." };

  await projects.removeMember(parsed.data.memberId);
  revalidatePath("/projects");
  return { ok: true };
}

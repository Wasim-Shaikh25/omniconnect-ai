"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, requireUser, ForbiddenError } from "@/modules/auth";
import { getUserProfile } from "@/modules/users";
import {
  createProject,
  listProjects,
  archiveProject,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  projects,
} from "../infrastructure/container";
import type { ProjectMemberRole } from "../application/ports";
import { createProjectSchema } from "../application/project";

export interface ProjectActionState {
  error?: string;
  ok?: boolean;
}

async function requireStoreOwner() {
  return requireRole("STORE_OWNER");
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireStoreOwner();
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
    if (error instanceof ForbiddenError) return { error: error.message };
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

  const project = await projects.findById(projectId, user.organizationId);
  if (!project) return null;

  const members = await listProjectMembers(projectId, user.organizationId);
  return { project, members };
}

export async function archiveProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireStoreOwner();
  if (!user.organizationId) {
    return { error: "No workspace is linked to your account." };
  }

  const parsed = projectIdSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return { error: "Invalid project." };

  await archiveProject(parsed.data.projectId, user.organizationId);
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
  const user = await requireStoreOwner();
  if (!user.organizationId) {
    return { error: "No workspace is linked to your account." };
  }

  const parsed = addMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const project = await projects.findById(parsed.data.projectId, user.organizationId);
  if (!project) return { error: "Project not found." };

  const targetUser = await getUserProfile(parsed.data.userId);
  if (!targetUser || targetUser.organizationId !== user.organizationId) {
    return { error: "User is not a member of this workspace." };
  }

  const existingMembers = await listProjectMembers(parsed.data.projectId, user.organizationId);
  if (existingMembers.some((m) => m.userId === parsed.data.userId)) {
    return { error: "User is already a member of this project." };
  }

  await addProjectMember({
    projectId: parsed.data.projectId,
    organizationId: user.organizationId,
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
  const user = await requireStoreOwner();
  if (!user.organizationId) {
    return { error: "No workspace is linked to your account." };
  }

  const parsed = removeMemberSchema.safeParse({
    memberId: formData.get("memberId"),
  });
  if (!parsed.success) return { error: "Invalid member." };

  await removeProjectMember(parsed.data.memberId, user.organizationId);
  revalidatePath("/projects");
  return { ok: true };
}

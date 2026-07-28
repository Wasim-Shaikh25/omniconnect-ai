import { z } from "zod";
import { Result, ok, err } from "@/shared/kernel";
import { ProjectRepository, ProjectRecord, ProjectMemberRecord, ProjectMemberRole } from "./ports";

export const createProjectSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  instagramHandle: z.string().max(120).optional(),
  integrationId: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export type ProjectError = { message: string };

export function makeCreateProject(deps: { projects: ProjectRepository }) {
  return async function createProject(
    raw: CreateProjectInput,
  ): Promise<Result<ProjectRecord, ProjectError>> {
    const input = createProjectSchema.parse(raw);
    try {
      const project = await deps.projects.create({
        organizationId: input.organizationId,
        name: input.name,
        description: input.description ?? null,
        instagramHandle: input.instagramHandle ?? null,
        integrationId: input.integrationId,
      });
      return ok(project);
    } catch (error) {
      return err({ message: error instanceof Error ? error.message : "Could not create project" });
    }
  };
}

export function makeListProjects(deps: { projects: ProjectRepository }) {
  return async function listProjects(organizationId: string): Promise<ProjectRecord[]> {
    return deps.projects.listByOrganization(organizationId);
  };
}

export function makeArchiveProject(deps: { projects: ProjectRepository }) {
  return async function archiveProject(
    id: string,
    organizationId: string,
  ): Promise<ProjectRecord | null> {
    return deps.projects.archive(id, organizationId);
  };
}

export function makeAddProjectMember(deps: { projects: ProjectRepository }) {
  return async function addProjectMember(input: {
    projectId: string;
    organizationId: string;
    userId: string;
    role: ProjectMemberRole;
  }): Promise<ProjectMemberRecord> {
    return deps.projects.addMember(input);
  };
}

export function makeRemoveProjectMember(deps: { projects: ProjectRepository }) {
  return async function removeProjectMember(
    memberId: string,
    organizationId: string,
  ): Promise<void> {
    return deps.projects.removeMember(memberId, organizationId);
  };
}

export function makeListProjectMembers(deps: { projects: ProjectRepository }) {
  return async function listProjectMembers(
    projectId: string,
    organizationId?: string,
  ): Promise<ProjectMemberRecord[]> {
    return deps.projects.listMembers(projectId, organizationId);
  };
}

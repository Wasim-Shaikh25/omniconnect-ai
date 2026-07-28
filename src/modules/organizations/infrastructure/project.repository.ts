import { prisma } from "@/shared/database";
import {
  ProjectRecord,
  ProjectMemberRecord,
  ProjectRepository,
  ProjectMemberRole,
} from "../application/ports";

function mapProject(project: {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  instagramHandle: string | null;
  integrationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectRecord {
  return {
    id: project.id,
    organizationId: project.organizationId,
    name: project.name,
    description: project.description,
    instagramHandle: project.instagramHandle,
    integrationId: project.integrationId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function mapMember(member: {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectMemberRecord {
  return {
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    role: member.role as ProjectMemberRole,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  async create(input: {
    organizationId: string;
    name: string;
    description?: string | null;
    instagramHandle?: string | null;
    integrationId?: string | null;
  }): Promise<ProjectRecord> {
    const existing = await prisma.project.findFirst({
      where: { organizationId: input.organizationId, name: input.name },
    });
    if (existing) {
      throw new Error("A project with this name already exists in the workspace.");
    }
    const project = await prisma.project.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description ?? null,
        instagramHandle: input.instagramHandle ?? null,
        integrationId: input.integrationId ?? null,
      },
    });
    return mapProject(project);
  }

  async listByOrganization(organizationId: string): Promise<ProjectRecord[]> {
    const projects = await prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return projects.map(mapProject);
  }

  async findById(id: string, organizationId?: string): Promise<ProjectRecord | null> {
    const project = await prisma.project.findUnique({
      where: organizationId ? { id, organizationId } : { id },
    });
    return project ? mapProject(project) : null;
  }

  async archive(id: string, organizationId: string): Promise<ProjectRecord | null> {
    const project = await prisma.project.delete({
      where: { id, organizationId },
    });
    return project ? mapProject(project) : null;
  }

  async addMember(input: {
    projectId: string;
    organizationId: string;
    userId: string;
    role: ProjectMemberRole;
  }): Promise<ProjectMemberRecord> {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId, organizationId: input.organizationId },
    });
    if (!project) throw new Error("Project not found");

    const member = await prisma.projectMember.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        role: input.role,
      },
    });
    return mapMember(member);
  }

  async removeMember(memberId: string, organizationId: string): Promise<void> {
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!member || member.project.organizationId !== organizationId) {
      throw new Error("Project member not found");
    }
    await prisma.projectMember.delete({ where: { id: memberId } });
  }

  async listMembers(projectId: string, organizationId?: string): Promise<ProjectMemberRecord[]> {
    const project = await prisma.project.findUnique({
      where: organizationId ? { id: projectId, organizationId } : { id: projectId },
    });
    if (!project) return [];

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return members.map(mapMember);
  }
}

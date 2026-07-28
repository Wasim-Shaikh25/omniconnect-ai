import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { EcommerceProvider } from "../domain/provider";
import { Plan } from "../domain/plan";

export type ProjectMemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface OrganizationRecord {
  id: string;
  name: string;
  plan: Plan;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: Date;
}

export interface StoreRecord {
  id: string;
  name: string;
  provider: EcommerceProvider;
  domain: string | null;
  organizationId: string;
  createdAt: Date;
}

export interface ProjectRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  instagramHandle: string | null;
  integrationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberRecord {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationRepository {
  create(input: { name: string }): Promise<OrganizationRecord>;
  findById(id: string): Promise<OrganizationRecord | null>;
  findBySubscriptionId(subscriptionId: string): Promise<OrganizationRecord | null>;
  listAll(pagination?: PaginationInput): Promise<PaginatedResult<OrganizationRecord>>;
  updatePlan(
    id: string,
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null },
  ): Promise<OrganizationRecord | null>;
  /**
   * Atomically increments the organization's monthly AI reply counter when it is
   * still below the supplied limit. Resets the counter when crossing into a new
   * month. Returns true when the increment succeeded, false when the limit is
   * already reached. A `null` limit means unlimited.
   */
  incrementAIReplies(id: string, limit: number | null): Promise<boolean>;
}

export interface StoreRepository {
  create(
    input: {
      organizationId: string;
      name: string;
      provider: EcommerceProvider;
      domain: string | null;
    },
    maxStores?: number | null,
  ): Promise<StoreRecord>;
  listByOrganization(organizationId: string): Promise<StoreRecord[]>;
  findById(id: string): Promise<StoreRecord | null>;
}

export interface ProjectRepository {
  create(input: {
    organizationId: string;
    name: string;
    description?: string | null;
    instagramHandle?: string | null;
    integrationId?: string | null;
  }): Promise<ProjectRecord>;
  listByOrganization(organizationId: string): Promise<ProjectRecord[]>;
  findById(id: string, organizationId?: string): Promise<ProjectRecord | null>;
  archive(id: string, organizationId: string): Promise<ProjectRecord | null>;
  addMember(input: {
    projectId: string;
    organizationId: string;
    userId: string;
    role: ProjectMemberRole;
  }): Promise<ProjectMemberRecord>;
  removeMember(memberId: string, organizationId: string): Promise<void>;
  listMembers(projectId: string, organizationId?: string): Promise<ProjectMemberRecord[]>;
}

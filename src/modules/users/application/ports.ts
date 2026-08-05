import type { Role } from "@/modules/auth";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";

export interface ExportRequestRecord {
  id: string;
  userId: string;
  organizationId: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "EXPIRED";
  downloadUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  isSuperAdmin: boolean;
  organizationId: string | null;
  storeId: string | null;
}

export interface UserProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  updateProfile(
    id: string,
    data: { name?: string | null; image?: string | null },
  ): Promise<UserProfile>;
  setOrganization(id: string, organizationId: string): Promise<void>;
  setRole(id: string, role: Role): Promise<UserProfile>;
  setStore(id: string, storeId: string | null): Promise<UserProfile>;
  listByOrganization(organizationId: string, pagination?: PaginationInput): Promise<PaginatedResult<UserProfile>>;
  listAll(pagination?: PaginationInput): Promise<PaginatedResult<UserProfile>>;
  countByOrganization(organizationId: string): Promise<number>;
  setSuperAdmin(id: string, isSuperAdmin: boolean): Promise<UserProfile>;
  removeFromOrganization(id: string): Promise<UserProfile>;
  requestDataExport(userId: string, organizationId?: string | null): Promise<ExportRequestRecord>;
  listExportRequests(userId: string, limit?: number): Promise<ExportRequestRecord[]>;
  getExportRequest(id: string, userId: string): Promise<ExportRequestRecord | null>;
  markExportCompleted(id: string, downloadUrl: string): Promise<ExportRequestRecord | null>;
  deleteAccount(userId: string, reason?: string | null): Promise<UserProfile | null>;
  hardDeleteExpired(before: Date): Promise<number>;
}

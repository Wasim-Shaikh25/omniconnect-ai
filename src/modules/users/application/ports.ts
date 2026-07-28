import type { Role } from "@/modules/auth";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";

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
  listByOrganization(organizationId: string, pagination?: PaginationInput): Promise<PaginatedResult<UserProfile>>;
  listAll(pagination?: PaginationInput): Promise<PaginatedResult<UserProfile>>;
  countByOrganization(organizationId: string): Promise<number>;
  setSuperAdmin(id: string, isSuperAdmin: boolean): Promise<UserProfile>;
}

import type { Role } from "@/modules/auth";

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
  listByOrganization(organizationId: string): Promise<UserProfile[]>;
  listAll(): Promise<UserProfile[]>;
  setSuperAdmin(id: string, isSuperAdmin: boolean): Promise<UserProfile>;
}

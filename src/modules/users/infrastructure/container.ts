import { PaginationInput } from "@/shared/kernel";
import { makeUpdateProfile } from "../application/update-profile";
import { makeChangeUserRole } from "../application/change-role";
import {
  makeListAuditLogs,
  makeCreateAuditLog,
} from "../application/audit-use-cases";
import { UserProfile } from "../application/ports";
import { PrismaUserProfileRepository } from "./user.repository";
import { PrismaAuditLogRepository } from "./audit.repository";

const users = new PrismaUserProfileRepository();
const auditLogs = new PrismaAuditLogRepository();

/** Composition root for the users module. */
export const userRepository = users;
export const updateProfile = makeUpdateProfile({ users });
export const changeUserRole = makeChangeUserRole({ users });

export const auditQueries = {
  listByOrganization: makeListAuditLogs({ auditLogs }),
};

export const auditCommands = {
  create: makeCreateAuditLog({ auditLogs }),
};

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  return users.findById(id);
}

export async function listOrganizationUsers(
  organizationId: string,
  pagination?: PaginationInput,
) {
  return users.listByOrganization(organizationId, pagination);
}

export async function listAllUsers(pagination?: PaginationInput) {
  return users.listAll(pagination);
}

export async function countOrganizationUsers(organizationId: string) {
  return users.countByOrganization(organizationId);
}

export async function setUserSuperAdmin(
  id: string,
  isSuperAdmin: boolean,
): Promise<UserProfile> {
  return users.setSuperAdmin(id, isSuperAdmin);
}

export async function setUserOrganization(
  id: string,
  organizationId: string,
): Promise<void> {
  return users.setOrganization(id, organizationId);
}

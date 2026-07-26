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
): Promise<UserProfile[]> {
  return users.listByOrganization(organizationId);
}

export async function listAllUsers(): Promise<UserProfile[]> {
  return users.listAll();
}

export async function setUserSuperAdmin(
  id: string,
  isSuperAdmin: boolean,
): Promise<UserProfile> {
  return users.setSuperAdmin(id, isSuperAdmin);
}

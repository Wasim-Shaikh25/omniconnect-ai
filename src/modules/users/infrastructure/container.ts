import { PaginationInput } from "@/shared/kernel";
import { makeUpdateProfile } from "../application/update-profile";
import { makeChangeUserRole } from "../application/change-role";
import {
  makeListAuditLogs,
  makeCreateAuditLog,
} from "../application/audit-use-cases";
import { makeDataExportService } from "../application/data-export";
import { makeDeleteAccountService } from "../application/delete-account";
import { UserProfile } from "../application/ports";
import { PrismaUserProfileRepository } from "./user.repository";
import { PrismaAuditLogRepository } from "./audit.repository";
import { prismaDataExportBuilder } from "./data-export";

const users = new PrismaUserProfileRepository();
const auditLogs = new PrismaAuditLogRepository();

/** Composition root for the users module. */
export const userRepository = users;
export const updateProfile = makeUpdateProfile({ users });
export const changeUserRole = makeChangeUserRole({ users });
export const dataExportService = makeDataExportService({ users, builder: prismaDataExportBuilder });
export const deleteAccountService = makeDeleteAccountService(users);

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
  userId: string,
  pagination?: PaginationInput,
) {
  return users.listByOrganization(userId, pagination);
}

export async function listAllUsers(
  pagination?: PaginationInput,
  filter?: Parameters<typeof users.listAll>[1],
) {
  return users.listAll(pagination, filter);
}

export async function setUserSuspended(id: string, suspended: boolean): Promise<UserProfile> {
  return users.setSuspended(id, suspended);
}

export async function setUserBanned(id: string, banned: boolean): Promise<UserProfile> {
  return users.setBanned(id, banned);
}

export async function countOrganizationUsers(userId: string) {
  return users.countByOrganization(userId);
}

export async function setUserSuperAdmin(
  id: string,
  isSuperAdmin: boolean,
): Promise<UserProfile> {
  return users.setSuperAdmin(id, isSuperAdmin);
}

export async function setUserOrganization(
  id: string,
  userId: string,
): Promise<void> {
  return users.setOrganization(id, userId);
}

export async function setUserStore(
  id: string,
  projectId: string | null,
): Promise<UserProfile> {
  return users.setStore(id, projectId);
}

export async function removeUserFromOrganization(id: string): Promise<UserProfile> {
  return users.removeFromOrganization(id);
}

import { makeUpdateProfile } from "../application/update-profile";
import { makeChangeUserRole } from "../application/change-role";
import { UserProfile } from "../application/ports";
import { PrismaUserProfileRepository } from "./user.repository";

const users = new PrismaUserProfileRepository();

/** Composition root for the users module. */
export const userRepository = users;
export const updateProfile = makeUpdateProfile({ users });
export const changeUserRole = makeChangeUserRole({ users });

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  return users.findById(id);
}

export async function listOrganizationUsers(
  organizationId: string,
): Promise<UserProfile[]> {
  return users.listByOrganization(organizationId);
}

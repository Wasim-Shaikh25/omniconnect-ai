import { z } from "zod";
import { eventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { ROLES, ForbiddenError, roleSatisfies, type Role } from "@/modules/auth";
import { UserNotFoundError } from "../domain/errors";
import { UserRoleChanged } from "../domain/events";
import { UserProfile, UserProfileRepository } from "./ports";

export const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export interface ChangedByContext {
  id: string;
  role: Role;
  userId: string | null;
}

export function makeChangeUserRole(deps: { users: UserProfileRepository }) {
  return async function changeUserRole(
    raw: ChangeRoleInput,
    changedBy: ChangedByContext,
  ): Promise<Result<UserProfile, UserNotFoundError | ForbiddenError>> {
    const input = changeRoleSchema.parse(raw);
    const existing = await deps.users.findById(input.userId);
    if (!existing) return err(new UserNotFoundError(input.userId));
    if (existing.userId !== changedBy.userId) {
      return err(new ForbiddenError("User is not in your organization."));
    }

    // A user cannot change their own role.
    if (input.userId === changedBy.id) {
      return err(new ForbiddenError("You cannot change your own role."));
    }

    // The new role cannot exceed the caller's role in the hierarchy.
    if (!roleSatisfies(changedBy.role, input.role)) {
      return err(new ForbiddenError("You cannot assign a role higher than your own."));
    }

    // The caller must have a role at least as high as the existing role of the target.
    if (!roleSatisfies(changedBy.role, existing.role)) {
      return err(new ForbiddenError("You cannot modify a user with a higher role."));
    }

    // Prevent removing the last admin-level user from the organization.
    const isDemotingAdmin =
      roleSatisfies(existing.role, "STORE_OWNER") && !roleSatisfies(input.role, "STORE_OWNER");
    if (isDemotingAdmin) {
      const peers = await deps.users.listByOrganization(existing.userId ?? "", { page: 1, limit: 10000 });
      const otherAdmins = peers.items.filter(
        (p) => p.id !== input.userId && roleSatisfies(p.role, "STORE_OWNER"),
      );
      if (otherAdmins.length === 0) {
        return err(new ForbiddenError("Cannot remove the last owner/admin from the organization."));
      }
    }

    const profile = await deps.users.setRole(input.userId, input.role);
    await eventBus.publish(
      new UserRoleChanged(input.userId, {
        userId: input.userId,
        role: input.role,
        changedByUserId: changedBy.id,
      }),
    );
    return ok(profile);
  };
}

import { z } from "zod";
import { eventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { ROLES, ForbiddenError } from "@/modules/auth";
import { UserNotFoundError } from "../domain/errors";
import { UserRoleChanged } from "../domain/events";
import { UserProfile, UserProfileRepository } from "./ports";

export const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export function makeChangeUserRole(deps: { users: UserProfileRepository }) {
  return async function changeUserRole(
    raw: ChangeRoleInput,
    changedByUserId: string,
    changedByOrganizationId: string | null,
  ): Promise<Result<UserProfile, UserNotFoundError | ForbiddenError>> {
    const input = changeRoleSchema.parse(raw);
    const existing = await deps.users.findById(input.userId);
    if (!existing) return err(new UserNotFoundError(input.userId));
    if (existing.organizationId !== changedByOrganizationId) {
      return err(new ForbiddenError());
    }

    const profile = await deps.users.setRole(input.userId, input.role);
    await eventBus.publish(
      new UserRoleChanged(input.userId, {
        userId: input.userId,
        role: input.role,
        changedByUserId,
      }),
    );
    return ok(profile);
  };
}

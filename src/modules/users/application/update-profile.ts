import { z } from "zod";
import { eventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { UserNotFoundError } from "../domain/errors";
import { UserProfileUpdated } from "../domain/events";
import { UserProfile, UserProfileRepository } from "./ports";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  image: z.string().url().max(2048).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export function makeUpdateProfile(deps: { users: UserProfileRepository }) {
  return async function updateProfile(
    userId: string,
    raw: UpdateProfileInput,
  ): Promise<Result<UserProfile, UserNotFoundError>> {
    const input = updateProfileSchema.parse(raw);
    const existing = await deps.users.findById(userId);
    if (!existing) return err(new UserNotFoundError(userId));

    const profile = await deps.users.updateProfile(userId, {
      name: input.name ?? existing.name,
      image: input.image ?? existing.image,
    });

    await eventBus.publish(
      new UserProfileUpdated(userId, { userId, name: profile.name }),
    );
    return ok(profile);
  };
}

import { z } from "zod";
import type { OrganizationRepository } from "./ports";

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export interface CreateOrganizationInput {
  userId: string;
  userEmail: string;
  name?: string | null;
}

export function makeCreateOrganization(deps: {
  organizations: OrganizationRepository;
  setUserOrganization: (id: string, userId: string) => Promise<void>;
}) {
  return async function createOrganization(input: CreateOrganizationInput) {
    // The owner User is the tenant. Persist `userId` as the user's own id so
    // owner/staff checks can use `user.userId === user.id`.
    await deps.setUserOrganization(input.userId, input.userId);

    const org = await deps.organizations.findById(input.userId);
    if (!org) {
      throw new Error("Owner record not found after onboarding setup.");
    }
    return org;
  };
}

export type CreateOrganization = ReturnType<typeof makeCreateOrganization>;

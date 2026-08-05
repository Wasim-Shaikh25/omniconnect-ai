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
    const trimmed = input.name?.trim();
    const localPart = input.userEmail.split("@")[0] ?? "My";
    const name = trimmed && trimmed.length > 0 ? trimmed : `${localPart}'s Organization`;

    const org = await deps.organizations.create({ name });
    await deps.setUserOrganization(input.userId, org.id);

    return org;
  };
}

export type CreateOrganization = ReturnType<typeof makeCreateOrganization>;

import { Result, ok, err } from "@/shared/kernel";
import type { OrganizationInviteRecord, OrganizationInviteRepository, OrganizationRepository } from "./ports";

const INVITE_TTL_DAYS = 7;

export interface ResendInviteDependencies {
  invites: OrganizationInviteRepository;
  organizations: OrganizationRepository;
  sendInviteEmail(input: {
    email: string;
    token: string;
    organizationName: string;
    projectId?: string;
  }): Promise<void>;
  generateToken(): string;
  now(): Date;
}

export interface ResendInviteInput {
  inviteId: string;
  userId: string;
}

export function makeResendInvite(deps: ResendInviteDependencies) {
  return async function resendInvite(
    input: ResendInviteInput,
  ): Promise<Result<OrganizationInviteRecord, Error>> {
    const invite = await deps.invites.findById(input.inviteId, input.userId);
    if (!invite) return err(new Error("Invite not found."));
    if (invite.status !== "PENDING") return err(new Error("Invite is no longer pending."));

    const organization = await deps.organizations.findById(input.userId);
    if (!organization) return err(new Error("Organization not found."));

    const token = deps.generateToken();
    const expiresAt = new Date(deps.now());
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const updated = await deps.invites.updateToken(input.inviteId, input.userId, token, expiresAt);
    if (!updated) return err(new Error("Could not update invite."));

    await deps.sendInviteEmail({
      email: updated.email,
      token,
      organizationName: organization.name,
      projectId: updated.projectId ?? undefined,
    });

    return ok(updated);
  };
}

import { Result, ok, err } from "@/shared/kernel";
import type { OrganizationInviteRecord, OrganizationInviteRepository } from "./ports";

export interface RevokeInviteDependencies {
  invites: OrganizationInviteRepository;
}

export interface RevokeInviteInput {
  inviteId: string;
  organizationId: string;
}

export function makeRevokeInvite(deps: RevokeInviteDependencies) {
  return async function revokeInvite(
    input: RevokeInviteInput,
  ): Promise<Result<OrganizationInviteRecord, Error>> {
    const invite = await deps.invites.findById(input.inviteId, input.organizationId);
    if (!invite) return err(new Error("Invite not found."));
    if (invite.status !== "PENDING") return err(new Error("Invite is no longer pending."));
    await deps.invites.deleteInvite(input.inviteId, input.organizationId);
    return ok(invite);
  };
}

import { Result, ok, err } from "@/shared/kernel";
import type { OrganizationInviteRecord, OrganizationInviteRepository } from "./ports";

export interface ValidateAcceptInviteDependencies {
  invites: OrganizationInviteRepository;
  now(): Date;
}

export class InvalidInviteError extends Error {
  constructor(message = "This invite link is invalid or has expired.") {
    super(message);
    this.name = "InvalidInviteError";
  }
}

export function makeValidateInvite(deps: ValidateAcceptInviteDependencies) {
  return async function validateInvite(
    token: string,
  ): Promise<Result<OrganizationInviteRecord, InvalidInviteError>> {
    const invite = await deps.invites.findByToken(token);
    if (!invite || invite.status !== "PENDING") {
      return err(new InvalidInviteError());
    }
    if (invite.expiresAt <= deps.now()) {
      await deps.invites.updateStatus(invite.id, "EXPIRED").catch(() => undefined);
      return err(new InvalidInviteError("This invite link has expired."));
    }
    return ok(invite);
  };
}

export function makeAcceptInvite(deps: ValidateAcceptInviteDependencies) {
  return async function acceptInvite(
    token: string,
  ): Promise<Result<OrganizationInviteRecord, InvalidInviteError>> {
    const validate = makeValidateInvite(deps);
    const result = await validate(token);
    if (!result.ok) return result;

    const accepted = await deps.invites.updateStatus(result.value.id, "ACCEPTED");
    return ok(accepted);
  };
}

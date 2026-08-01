import { z } from "zod";
import type { Role } from "@/modules/auth";
import { Result, ok, err } from "@/shared/kernel";
import { Plan, planLimits } from "../domain/plan";
import { OrganizationNotFoundError, SeatLimitError } from "../domain/errors";
import type {
  OrganizationInviteRecord,
  OrganizationInviteRepository,
  OrganizationRepository,
} from "./ports";

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"] as const),
  storeId: z.string().optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export interface InviteMemberDependencies {
  organizations: OrganizationRepository;
  invites: OrganizationInviteRepository;
  sendInviteEmail(input: {
    email: string;
    token: string;
    organizationName: string;
    storeId?: string;
  }): Promise<void>;
  generateToken(): string;
  now(): Date;
}

export interface InviteMemberResult {
  invite: OrganizationInviteRecord;
}

const INVITE_TTL_DAYS = 7;

export function makeInviteMember(deps: InviteMemberDependencies) {
  return async function inviteMember(
    input: InviteMemberInput & { organizationId: string; createdByUserId: string },
  ): Promise<Result<InviteMemberResult, OrganizationNotFoundError | SeatLimitError | Error>> {
    const parsed = inviteMemberSchema.safeParse({
      email: input.email,
      role: input.role,
      storeId: input.storeId,
    });
    if (!parsed.success) {
      return err(new Error(parsed.error.issues[0]?.message ?? "Invalid input"));
    }

    const email = parsed.data.email.toLowerCase().trim();
    const role = parsed.data.role as Role;
    const storeId = parsed.data.storeId?.trim();
    const organization = await deps.organizations.findById(input.organizationId);
    if (!organization) {
      return err(new OrganizationNotFoundError(input.organizationId));
    }

    const existing = await deps.invites.findPendingByEmail(input.organizationId, email);
    if (existing) {
      return err(new Error("An invite is already pending for this email."));
    }

    const { teamSeats } = planLimits(organization.plan as Plan);
    const token = deps.generateToken();
    const expiresAt = new Date(deps.now());
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const result = await deps.invites.createWithinSeatLimit(
      {
        email,
        organizationId: input.organizationId,
        role,
        storeId: storeId ?? null,
        token,
        createdByUserId: input.createdByUserId,
        expiresAt,
      },
      teamSeats,
    );

    if (!result.ok) {
      return err(new SeatLimitError(result.limit));
    }

    await deps.sendInviteEmail({
      email,
      token,
      organizationName: organization.name,
      storeId,
    });

    return ok({ invite: result.invite });
  };
}

import { z } from "zod";
import type { EventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { EmailAlreadyInUseError } from "../domain/errors";
import { Role } from "../domain/role";
import { UserRegistered } from "../domain/events";
import { AccountRepository, PasswordHasher } from "./ports";

export const registerUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(200),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export interface RegisteredUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * Registers a new user with email + password. Emits `UserRegistered` so other
 * modules (e.g. notifications, analytics) can react without coupling.
 */
export interface RegisterUserOptions {
  organizationId?: string | null;
  role?: Role;
}

export function makeRegisterUser(deps: {
  accounts: AccountRepository;
  hasher: PasswordHasher;
  eventBus: EventBus;
}) {
  return async function registerUser(
    raw: RegisterUserInput,
    options?: RegisterUserOptions,
  ): Promise<Result<RegisteredUser, EmailAlreadyInUseError>> {
    const input = registerUserSchema.parse(raw);
    const email = input.email.toLowerCase().trim();

    const existing = await deps.accounts.findByEmail(email);
    if (existing) return err(new EmailAlreadyInUseError(email));

    const passwordHash = await deps.hasher.hash(input.password);
    const role = options?.role ?? "STORE_OWNER";
    const account = await deps.accounts.create({
      email,
      name: input.name ?? null,
      passwordHash,
      role,
      organizationId: options?.organizationId ?? null,
    });

    await deps.eventBus.publish(
      new UserRegistered(account.id, {
        userId: account.id,
        email: account.email,
        role: account.role,
      }),
    );

    return ok({ id: account.id, email: account.email, role: account.role });
  };
}

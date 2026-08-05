import { z } from "zod";
import type { EventBus } from "@/shared/events";
import { Result, ok } from "@/shared/kernel";
import { isPasswordValid, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../domain/password-policy";
import { isE164Phone } from "../domain/phone";
import { Role } from "../domain/role";
import { UserRegistered } from "../domain/events";
import { AccountRepository, PasswordHasher } from "./ports";

export const registerUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(120).optional(),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    confirmPassword: z.string(),
    phone: z
      .string()
      .refine((v) => v === "" || isE164Phone(v), {
        message: "Use international format, e.g. +447700900123",
      })
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => isPasswordValid(data.password), {
    message: `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    path: ["password"],
  })
  .transform((data) => ({
    ...data,
    phone: data.phone?.trim() || undefined,
    email: data.email.toLowerCase().trim(),
  }));

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export interface RegisteredUser {
  id: string;
  email: string;
  role: Role;
  isExisting: boolean;
}

export interface RegisterUserOptions {
  userId?: string | null;
  role?: Role;
  projectId?: string | null;
  emailVerified?: Date | null;
}

export function makeRegisterUser(deps: {
  accounts: AccountRepository;
  hasher: PasswordHasher;
  eventBus: EventBus;
}) {
  return async function registerUser(
    raw: RegisterUserInput,
    options?: RegisterUserOptions,
  ): Promise<Result<RegisteredUser, Error>> {
    const input = registerUserSchema.parse(raw);

    const existing = await deps.accounts.findByEmail(input.email);
    if (existing) {
      return ok({
        id: existing.id,
        email: existing.email,
        role: existing.role,
        isExisting: true,
      });
    }

    const passwordHash = await deps.hasher.hash(input.password);
    const role = options?.role ?? "STORE_OWNER";
    const emailVerified = options?.emailVerified ?? null;
    const account = await deps.accounts.create({
      email: input.email,
      name: input.name ?? null,
      passwordHash,
      role,
      phone: input.phone ?? null,
      emailVerified,
      userId: options?.userId ?? null,
      projectId: options?.projectId ?? null,
    });

    await deps.eventBus.publish(
      new UserRegistered(account.id, {
        userId: account.id,
        email: account.email,
        role: account.role,
        autoProvisionOrganization: false,
      }),
    );

    return ok({ id: account.id, email: account.email, role: account.role, isExisting: false });
  };
}

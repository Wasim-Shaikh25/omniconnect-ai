import { z } from "zod";
import { Result, ok, err } from "@/shared/kernel";
import {
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "../domain/password-policy";
import { AccountRepository, PasswordHasher } from "./ports";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => isPasswordValid(data.newPassword), {
    message: `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface ChangePasswordService {
  change(input: { userId: string; currentPassword: string; newPassword: string }): Promise<Result<{ tokenVersion: number }, Error>>;
}

interface ChangePasswordDeps {
  accounts: AccountRepository;
  hasher: PasswordHasher;
}

export function makeChangePasswordService(deps: ChangePasswordDeps): ChangePasswordService {
  return {
    async change(input) {
      const account = await deps.accounts.findById(input.userId);
      if (!account || !account.passwordHash) {
        return err(new Error("Invalid credentials"));
      }

      const passwordMatches = await deps.hasher.compare(input.currentPassword, account.passwordHash);
      if (!passwordMatches) {
        return err(new Error("Current password is incorrect"));
      }

      if (!isPasswordValid(input.newPassword)) {
        return err(new Error("Password does not meet the policy"));
      }

      const newHash = await deps.hasher.hash(input.newPassword);
      const updated = await deps.accounts.updatePassword({ id: account.id, passwordHash: newHash });
      if (!updated) {
        return err(new Error("Could not update password"));
      }

      return ok({ tokenVersion: updated.tokenVersion });
    },
  };
}

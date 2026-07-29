import { UserProfile, UserProfileRepository } from "./ports";

export interface DeleteAccountService {
  deleteAccount(userId: string, reason?: string | null): Promise<UserProfile | null>;
  cleanupExpired(before: Date): Promise<number>;
}

export function makeDeleteAccountService(users: UserProfileRepository): DeleteAccountService {
  return {
    async deleteAccount(userId, reason) {
      return users.deleteAccount(userId, reason);
    },
    async cleanupExpired(before) {
      return users.hardDeleteExpired(before);
    },
  };
}

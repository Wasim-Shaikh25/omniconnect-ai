import { logger, redactValue } from "@/shared/observability";
import type { SmsSender } from "@/modules/notifications";
import {
  generatePhoneCode,
  isE164Phone,
  normalizePhone,
} from "../domain/phone-code";
import {
  generateVerificationSalt,
  hashVerificationToken,
  verifyVerificationToken,
} from "../domain/verification-token";
import type { AccountRepository, VerificationRequestRepository } from "./ports";

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;

export interface PhoneVerificationService {
  request(userId: string, phone: string): Promise<{ success: boolean; error?: string }>;
  verify(userId: string, code: string): Promise<{ success: boolean; error?: string }>;
  remove(userId: string): Promise<{ success: boolean; error?: string }>;
}

interface PhoneVerificationDeps {
  accounts: AccountRepository;
  repository: VerificationRequestRepository;
  smsSender: SmsSender | null;
  now?: () => number;
}

export function makePhoneVerificationService(deps: PhoneVerificationDeps): PhoneVerificationService {
  const now = deps.now ?? Date.now;

  return {
    async request(userId, rawPhone) {
      const phone = normalizePhone(rawPhone);
      if (!isE164Phone(phone)) {
        return { success: false, error: "Use international format, e.g. +447700900123." };
      }

      if (!deps.smsSender) {
        return { success: false, error: "Phone verification is not configured." };
      }

      const since = new Date(now() - 60 * 60 * 1000);
      const recent = await deps.repository.countRecentByTarget(phone, "phone_verify", since, { consumed: "all" });
      if (recent >= MAX_SENDS_PER_HOUR) {
        logger.warn("phoneVerification.rateLimited", { phone: redactValue(phone) });
        return { success: false, error: "Too many attempts. Try again in an hour." };
      }

      // Invalidate any previous pending phone-verification request for this user.
      const existing = await deps.repository.findPendingByUser(userId, "phone_verify");
      if (existing) {
        await deps.repository.consume(existing.id);
      }

      const code = generatePhoneCode();
      const salt = generateVerificationSalt();
      const tokenHash = await hashVerificationToken(code, salt);
      const expiresAt = new Date(now() + TTL_MS);

      await deps.repository.save({
        userId,
        channel: "phone",
        purpose: "phone_verify",
        target: phone,
        tokenHash,
        salt,
        attempts: 0,
        expiresAt,
        consumedAt: null,
      });

      const body = `Your OmniConnect verification code is: ${code}. It expires in 10 minutes.`;
      await deps.smsSender.send({ to: phone, body });

      logger.info("phoneVerification.issued", { userId, phone: redactValue(phone) });
      return { success: true };
    },

    async verify(userId, rawCode) {
      const code = rawCode.trim();
      if (!/^\d{6}$/.test(code)) {
        return { success: false, error: "Enter the 6-digit code." };
      }

      const request = await deps.repository.findPendingByUser(userId, "phone_verify");
      if (!request) {
        return { success: false, error: "Invalid or expired code." };
      }

      if (request.consumedAt || request.expiresAt.getTime() < now()) {
        return { success: false, error: "Invalid or expired code." };
      }

      if (request.attempts >= MAX_ATTEMPTS) {
        return { success: false, error: "Too many attempts. Request a new code." };
      }

      const valid = await verifyVerificationToken(code, request.tokenHash, request.salt ?? undefined);
      if (!valid) {
        await deps.repository.incrementAttempts(request.id);
        return { success: false, error: "Invalid or expired code." };
      }

      await deps.repository.consume(request.id);
      await deps.accounts.updatePhone(userId, request.target);
      await deps.accounts.setPhoneVerified(userId, new Date(now()));

      logger.info("phoneVerification.verified", { userId, phone: redactValue(request.target) });
      return { success: true };
    },

    async remove(userId) {
      const account = await deps.accounts.findById(userId);
      if (!account) {
        return { success: false, error: "User not found." };
      }

      await deps.accounts.updatePhone(userId, null);
      logger.info("phoneVerification.removed", { userId });
      return { success: true };
    },
  };
}

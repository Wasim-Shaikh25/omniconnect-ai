import { Role } from "../domain/role";

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  phone: string | null;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  role: Role;
  isSuperAdmin: boolean;
  organizationId: string | null;
  storeId: string | null;
  tokenVersion: number;
  deletedAt: Date | null;
}

/** Persistence port for user accounts (implemented in infrastructure). */
export interface AccountRepository {
  findById(id: string): Promise<AccountRecord | null>;
  findByEmail(email: string): Promise<AccountRecord | null>;
  findByEmailIncludingDeleted(email: string): Promise<AccountRecord | null>;
  restoreAccount(id: string): Promise<AccountRecord | null>;
  updatePassword(input: { id: string; passwordHash: string }): Promise<AccountRecord | null>;
  bumpTokenVersion(id: string): Promise<AccountRecord | null>;
  setEmailVerified(id: string, emailVerified: Date): Promise<AccountRecord | null>;
  create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
    phone?: string | null;
    emailVerified?: Date | null;
    isSuperAdmin?: boolean;
    organizationId?: string | null;
    storeId?: string | null;
  }): Promise<AccountRecord>;
}

/** Hashed, time-bounded verification request for email signup, email change, and phone verification. */
export interface VerificationRequestRecord {
  id: string;
  userId: string | null;
  channel: "email" | "phone";
  purpose: "signup" | "email_change" | "phone_verify" | "mfa";
  target: string;
  tokenHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface VerificationRequestRepository {
  save(request: Omit<VerificationRequestRecord, "id" | "createdAt">): Promise<VerificationRequestRecord>;
  findByTokenHash(tokenHash: string): Promise<VerificationRequestRecord | null>;
  consume(id: string): Promise<void>;
  incrementAttempts(id: string): Promise<void>;
  countRecentByTarget(target: string, purpose: string, since: Date): Promise<number>;
}

/** Persistence port for short-lived verification codes (MFA, password reset). */
export interface VerificationCodeRepository {
  save(identifier: string, token: string, expiresAt: Date): Promise<void>;
  consume(identifier: string, token: string): Promise<boolean>;
}

/** Password hashing port (implemented in infrastructure). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

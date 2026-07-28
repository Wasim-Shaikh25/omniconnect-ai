import { Role } from "../domain/role";

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: Role;
  isSuperAdmin: boolean;
  organizationId: string | null;
  tokenVersion: number;
}

/** Persistence port for user accounts (implemented in infrastructure). */
export interface AccountRepository {
  findById(id: string): Promise<AccountRecord | null>;
  findByEmail(email: string): Promise<AccountRecord | null>;
  updatePassword(input: { id: string; passwordHash: string }): Promise<AccountRecord | null>;
  bumpTokenVersion(id: string): Promise<AccountRecord | null>;
  create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
    phone?: string | null;
    isSuperAdmin?: boolean;
  }): Promise<AccountRecord>;
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

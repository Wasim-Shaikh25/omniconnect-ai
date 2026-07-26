import { Role } from "../domain/role";

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: Role;
  organizationId: string | null;
}

/** Persistence port for user accounts (implemented in infrastructure). */
export interface AccountRepository {
  findByEmail(email: string): Promise<AccountRecord | null>;
  findById(id: string): Promise<AccountRecord | null>;
  create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
  }): Promise<AccountRecord>;
  updatePassword(id: string, passwordHash: string): Promise<AccountRecord | null>;
}

/** Password hashing port (implemented in infrastructure). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

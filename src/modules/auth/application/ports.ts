import { Role } from "../domain/role";

export interface AccountRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: Role;
  isSuperAdmin: boolean;
  organizationId: string | null;
}

/** Persistence port for user accounts (implemented in infrastructure). */
export interface AccountRepository {
  findByEmail(email: string): Promise<AccountRecord | null>;
  create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
  }): Promise<AccountRecord>;
}

/** Password hashing port (implemented in infrastructure). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

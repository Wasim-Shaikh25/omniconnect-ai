import { PasswordHasher } from "../application/ports";

const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const bcrypt = (await import("bcryptjs")).default;
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    const bcrypt = (await import("bcryptjs")).default;
    return bcrypt.compare(plain, hash);
  }
}

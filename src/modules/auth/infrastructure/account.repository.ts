import { prisma } from "@/shared/database";
import { AccountRecord, AccountRepository } from "../application/ports";
import { Role } from "../domain/role";

function mapUser(user: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  phone: string | null;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  role: string;
  isSuperAdmin: boolean;
  tokenVersion: number;
  deletedAt: Date | null;
}): AccountRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    role: user.role as Role,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion,
    deletedAt: user.deletedAt,
  };
}

export class PrismaAccountRepository implements AccountRepository {
  async findById(id: string): Promise<AccountRecord | null> {
    const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
    if (!user) return null;
    return mapUser(user);
  }

  async findByEmail(email: string): Promise<AccountRecord | null> {
    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
    if (!user) return null;
    return mapUser(user);
  }

  async findByEmailIncludingDeleted(email: string): Promise<AccountRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return mapUser(user);
  }

  async restoreAccount(id: string): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id },
      data: { deletedAt: null, tokenVersion: { increment: 1 } },
    });
    return mapUser(user);
  }

  async updatePassword(input: { id: string; passwordHash: string }): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id: input.id, deletedAt: null },
      data: { passwordHash: input.passwordHash, tokenVersion: { increment: 1 } },
    });
    return mapUser(user);
  }

  async updateEmail(id: string, email: string): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: { email: email.toLowerCase().trim(), emailVerified: new Date(), tokenVersion: { increment: 1 } },
    });
    return mapUser(user);
  }

  async bumpTokenVersion(id: string): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: { tokenVersion: { increment: 1 } },
    });
    return mapUser(user);
  }

  async setEmailVerified(id: string, emailVerified: Date): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: { emailVerified },
    });
    return mapUser(user);
  }

  async create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
    phone?: string | null;
    emailVerified?: Date | null;
    isSuperAdmin?: boolean;
  }): Promise<AccountRecord> {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        role: input.role,
        phone: input.phone ?? null,
        emailVerified: input.emailVerified ?? null,
        isSuperAdmin: input.isSuperAdmin ?? false,
      },
    });
    return mapUser(user);
  }
}

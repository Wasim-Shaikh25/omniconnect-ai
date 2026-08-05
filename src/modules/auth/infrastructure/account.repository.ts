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
  userId: string | null;
  projectId: string | null;
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
    userId: user.userId ?? null,
    projectId: user.projectId ?? null,
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

  async updatePhone(id: string, phone: string | null): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: { phone, mobile: null, phoneVerified: null },
    });
    return mapUser(user);
  }

  async setPhoneVerified(id: string, phoneVerified: Date): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: { phoneVerified, mobileVerified: null },
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

  async reconcileSuperAdmin(
    id: string,
    input: {
      passwordHash: string;
      isSuperAdmin: boolean;
      phone?: string | null;
    },
  ): Promise<AccountRecord | null> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return null;
    const passwordChanged = existing.passwordHash !== input.passwordHash;
    const user = await prisma.user.update({
      where: { id, deletedAt: null },
      data: {
        passwordHash: input.passwordHash,
        isSuperAdmin: input.isSuperAdmin,
        role: input.isSuperAdmin ? "SUPER_ADMIN" : existing.role,
        phone: input.phone ?? existing.phone,
        tokenVersion: passwordChanged ? { increment: 1 } : undefined,
      },
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
    userId?: string | null;
    projectId?: string | null;
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
        userId: input.userId ?? null,
        projectId: input.projectId ?? null,
      },
    });
    return mapUser(user);
  }
}

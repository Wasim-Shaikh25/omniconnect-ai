import { prisma } from "@/shared/database";
import { AccountRecord, AccountRepository } from "../application/ports";
import { Role } from "../domain/role";

function mapUser(user: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
}): AccountRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role as Role,
    isSuperAdmin: user.isSuperAdmin,
    organizationId: user.organizationId,
  };
}

export class PrismaAccountRepository implements AccountRepository {
  async findByEmail(email: string): Promise<AccountRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return mapUser(user);
  }

  async updatePassword(input: { id: string; passwordHash: string }): Promise<AccountRecord | null> {
    const user = await prisma.user.update({
      where: { id: input.id },
      data: { passwordHash: input.passwordHash },
    });
    return mapUser(user);
  }

  async create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
    phone?: string | null;
    isSuperAdmin?: boolean;
  }): Promise<AccountRecord> {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        role: input.role,
        phone: input.phone ?? null,
        isSuperAdmin: input.isSuperAdmin ?? false,
      },
    });
    return mapUser(user);
  }
}

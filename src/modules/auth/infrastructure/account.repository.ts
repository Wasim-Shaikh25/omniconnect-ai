import { prisma } from "@/shared/database";
import { AccountRecord, AccountRepository } from "../application/ports";
import { Role } from "../domain/role";

export class PrismaAccountRepository implements AccountRepository {
  async findByEmail(email: string): Promise<AccountRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role as Role,
      organizationId: user.organizationId,
    };
  }

  async create(input: {
    email: string;
    name: string | null;
    passwordHash: string;
    role: Role;
  }): Promise<AccountRecord> {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role as Role,
      organizationId: user.organizationId,
    };
  }
}

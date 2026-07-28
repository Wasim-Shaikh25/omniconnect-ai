import { prisma } from "@/shared/database";
import { ForbiddenError, UnauthorizedError } from "../domain/errors";
import { isRole, Role, roleSatisfies } from "../domain/role";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isSuperAdmin: boolean;
  organizationId: string | null;
}

function toSessionUser(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
}): SessionUser {
  const role = isRole(row.role) ? (row.role as Role) : "STORE_OWNER";
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role,
    isSuperAdmin: row.isSuperAdmin,
    organizationId: row.organizationId,
  };
}

/** Returns the current user or null. Safe to call from server components. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin ?? false,
    organizationId: user.organizationId ?? null,
  };
}

async function loadFreshUser(id: string): Promise<SessionUser | null> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperAdmin: true,
      organizationId: true,
      tokenVersion: true,
    },
  });
  if (!row) return null;
  return toSessionUser(row);
}

/** Returns the current user or throws UnauthorizedError. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Returns the current user if they meet `role`, else throws. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const sessionUser = await requireUser();
  const fresh = await loadFreshUser(sessionUser.id);
  if (!fresh) throw new UnauthorizedError();
  if (!roleSatisfies(fresh.role, role)) throw new ForbiddenError();
  return fresh;
}

/** Returns the current user only if they are a platform super admin. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const sessionUser = await requireUser();
  const fresh = await loadFreshUser(sessionUser.id);
  if (!fresh || !fresh.isSuperAdmin) throw new ForbiddenError();
  return fresh;
}

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
  emailVerified: Date | null;
  userId: string | null;
  projectId: string | null;
}

function toSessionUser(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  emailVerified: Date | null;
}): Omit<SessionUser, "userId" | "projectId"> {
  const role = isRole(row.role) ? (row.role as Role) : "USER";
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role,
    isSuperAdmin: row.isSuperAdmin,
    emailVerified: row.emailVerified,
  };
}

/** Returns the current user or null. Always loads the canonical DB record and
 *  verifies the JWT `tokenVersion` so password/role changes invalidate sessions.
 *  Safe to call from server components.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;

  const fresh = await loadFreshUser(user.id);
  if (!fresh) return null;
  if (user.tokenVersion !== fresh.tokenVersion) return null;
  const { tokenVersion: _tokenVersion, ...sessionUser } = fresh;

  return {
    ...sessionUser,
    userId: sessionUser.id,
    projectId: user?.projectId ?? null,
  };
}

async function loadFreshUser(
  id: string,
): Promise<(Omit<SessionUser, "userId" | "projectId"> & { tokenVersion: number }) | null> {
  const row = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperAdmin: true,
      emailVerified: true,
      tokenVersion: true,
    },
  });
  if (!row) return null;
  return { ...toSessionUser(row), tokenVersion: row.tokenVersion };
}

/** Returns the current user or throws UnauthorizedError. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Returns the current user if they meet `role`, else throws. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleSatisfies(user.role, role)) throw new ForbiddenError();
  return user;
}

/** Returns the current user only if they are a platform super admin. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new ForbiddenError();
  return user;
}

/** Returns the current user only if their email has been verified. */
export async function requireVerifiedEmail(user?: SessionUser): Promise<SessionUser> {
  const sessionUser = user ?? (await getCurrentUser());
  if (!sessionUser) throw new UnauthorizedError();
  if (!sessionUser.emailVerified) {
    throw new ForbiddenError("Please verify your email address.");
  }
  return sessionUser;
}

import { ForbiddenError, UnauthorizedError } from "../domain/errors";
import { Role, roleSatisfies } from "../domain/role";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
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
  };
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

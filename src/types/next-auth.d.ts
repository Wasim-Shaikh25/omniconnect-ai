import type { Role } from "@/modules/auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isSuperAdmin: boolean;
      emailVerified: Date | null;
      userId: string | null;
      projectId: string | null;
      tokenVersion: number;
      phone: string | null;
      phoneVerified: Date | null;
      suspendedAt: Date | null;
      banned: boolean;
      impersonatedBy: string | null;
      isImpersonating: boolean;
      impersonatedUserId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    isSuperAdmin?: boolean;
    emailVerified?: Date | null;
    userId?: string | null;
    projectId?: string | null;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    isSuperAdmin?: boolean;
    emailVerified?: Date | null;
    userId?: string | null;
    projectId?: string | null;
    tokenVersion?: number;
    impersonatedUserId?: string | null;
  }
}

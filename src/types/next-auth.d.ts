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
  }
}

import type { Role } from "@/modules/auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isSuperAdmin: boolean;
      organizationId: string | null;
      storeId: string | null;
      tokenVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    isSuperAdmin?: boolean;
    organizationId?: string | null;
    storeId?: string | null;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    isSuperAdmin?: boolean;
    organizationId?: string | null;
    storeId?: string | null;
    tokenVersion?: number;
  }
}

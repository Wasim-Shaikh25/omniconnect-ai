import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/shared/database";
import { env } from "@/shared/config";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { isRole, type Role } from "../domain/role";
import { UserLoggedIn } from "../domain/events";
import { PrismaAccountRepository } from "./account.repository";
import { BcryptPasswordHasher } from "./password-hasher";

const accounts = new PrismaAccountRepository();
const hasher = new BcryptPasswordHasher();

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const email =
        typeof raw?.email === "string" ? raw.email.toLowerCase().trim() : "";
      const password = typeof raw?.password === "string" ? raw.password : "";
      if (!email || !password) return null;

      const account = await accounts.findByEmail(email);
      if (!account?.passwordHash) return null;

      const valid = await hasher.compare(password, account.passwordHash);
      if (!valid) return null;

      return {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        organizationId: account.organizationId,
      };
    },
  }),
];

export const googleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

if (googleAuthEnabled) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: unknown }).role;
        token.role = isRole(role) ? role : "STORE_OWNER";
        const orgId = (user as { organizationId?: unknown }).organizationId;
        token.organizationId = typeof orgId === "string" ? orgId : null;
      }
      // Refresh tenant claim when the session is explicitly updated.
      if (trigger === "update" && typeof token.id === "string") {
        const fresh = await accounts.findByEmail(
          typeof token.email === "string" ? token.email : "",
        );
        if (fresh) token.organizationId = fresh.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = isRole(token.role)
          ? (token.role as Role)
          : "STORE_OWNER";
        session.user.organizationId =
          typeof token.organizationId === "string"
            ? token.organizationId
            : null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      await eventBus.publish(
        new UserLoggedIn(user.id, { userId: user.id, email: user.email }),
      );
      logger.info("user.signIn", { userId: user.id });
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

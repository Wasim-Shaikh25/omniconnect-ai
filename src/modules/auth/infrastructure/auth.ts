import { NextResponse } from "next/server";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/shared/database";
import { EncryptedPrismaAdapter } from "./encrypted-prisma-adapter";
import { env } from "@/shared/config";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { isRole, type Role } from "../domain/role";
import { UserLoggedIn, UserRegistered } from "../domain/events";
import { PrismaAccountRepository } from "./account.repository";
import { verifyCode } from "./verification-code";
import { clientIp, rateLimit } from "@/shared/security/rate-limit";

const accounts = new PrismaAccountRepository();

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      mfaCode: { label: "MFA Code", type: "text" },
    },
    async authorize(raw, request) {
      const email =
        typeof raw?.email === "string" ? raw.email.toLowerCase().trim() : "";
      const password = typeof raw?.password === "string" ? raw.password : "";
      const mfaCode = typeof raw?.mfaCode === "string" ? raw.mfaCode : "";
      if (!email || !password) return null;

      const ip = request ? clientIp(request.headers) : "unknown";
      const limit = await rateLimit({
        key: `credentials:${email}:${ip}`,
        limit: 5,
        windowMs: 15 * 60 * 1000,
      });
      if (!limit.allowed) return null;

      const account = await accounts.findByEmailIncludingDeleted(email);
      if (!account?.passwordHash) return null;

      const { BcryptPasswordHasher } = await import("./password-hasher");
      const valid = await new BcryptPasswordHasher().compare(
        password,
        account.passwordHash,
      );
      if (!valid) return null;

      // Grace-period restoration: accounts soft-deleted within the last 30 days
      // can be reactivated by signing in. Beyond that, the account is gone.
      if (account.deletedAt) {
        const graceMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - account.deletedAt.getTime() > graceMs) {
          return null;
        }
        const restored = await accounts.restoreAccount(account.id);
        if (!restored) return null;
        account.deletedAt = null;
        account.tokenVersion = restored.tokenVersion;
      }

      if (account.isSuperAdmin) {
        if (!mfaCode) return null;
        const codeValid = await verifyCode(email, mfaCode, "mfa");
        if (!codeValid) return null;
      }

      return {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        isSuperAdmin: account.isSuperAdmin,
        organizationId: account.organizationId,
        storeId: account.storeId,
        tokenVersion: account.tokenVersion,
      };
    },
  }),
];

export interface OAuthProvider {
  id: string;
  name: string;
}

const oauthProviders: OAuthProvider[] = [];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
  oauthProviders.push({ id: "google", name: "Google" });
}

if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    Facebook({
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
    }),
  );
  oauthProviders.push({ id: "facebook", name: "Facebook" });
}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
  );
  oauthProviders.push({ id: "github", name: "GitHub" });
}

if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
  providers.push(
    Apple({
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
    }),
  );
  oauthProviders.push({ id: "apple", name: "Apple" });
}

export { oauthProviders };

async function refreshTokenFromDb(
  token: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  if (typeof token.id !== "string") return token;
  const fresh = await accounts.findById(token.id);
  if (!fresh) return null;
  return {
    ...token,
    role: fresh.role,
    isSuperAdmin: fresh.isSuperAdmin,
    organizationId: fresh.organizationId,
    storeId: fresh.storeId,
    tokenVersion: fresh.tokenVersion,
  };
}

export const authConfig: NextAuthConfig = {
  adapter: EncryptedPrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.storeId =
          typeof user.storeId === "string" ? user.storeId : null;
        // OAuth users do not go through the email/password registration flow,
        // so they may not have an organization. Provision one synchronously
        // before the JWT is issued so the token carries the tenant claim.
        if (account?.provider !== "credentials" && typeof user.id === "string") {
          const existing = await accounts.findById(user.id);
          if (existing && !existing.organizationId && user.email) {
            await eventBus.publish(
              new UserRegistered(user.id, {
                userId: user.id,
                email: user.email,
                role: "STORE_OWNER",
                autoProvisionOrganization: true,
              }),
            );
          }
        }
        // Always hydrate from the database so the token carries the current
        // canonical claims (role, organization, tokenVersion).
        const refreshed = await refreshTokenFromDb(token);
        if (!refreshed) return token;
        return refreshed;
      }
      if (trigger === "update" && typeof token.id === "string") {
        const refreshed = await refreshTokenFromDb(token);
        if (!refreshed) return token;
        return refreshed;
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
        session.user.isSuperAdmin =
          typeof token.isSuperAdmin === "boolean" ? token.isSuperAdmin : false;
        session.user.storeId =
          typeof token.storeId === "string" ? token.storeId : null;
        session.user.tokenVersion =
          typeof token.tokenVersion === "number" ? token.tokenVersion : 0;
      }
      return session;
    },
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const publicPaths = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/pricing",
        "/support",
        "/api/auth",
        "/api/meta/webhook",
        "/api/stripe/webhook",
        "/api/health",
        "/api/ready",
        "/_next",
        "/favicon.ico",
        "/manifest.webmanifest",
      ];
      if (
        publicPaths.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`),
        )
      ) {
        return true;
      }
      if (auth?.user) return true;
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user?.id || !user.email) return;
      await eventBus.publish(
        new UserLoggedIn(user.id, { userId: user.id, email: user.email }),
      );
      logger.info("user.signIn", { userId: user.id, provider: account?.provider });
    },
  },
};

export const { handlers, auth, signIn, signOut, unstable_update } =
  NextAuth(authConfig);

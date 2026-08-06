import { NextResponse } from "next/server";
import NextAuth, { type NextAuthConfig, CredentialsSignin } from "next-auth";
import { env } from "@/shared/config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/shared/database";
import { EncryptedPrismaAdapter } from "./encrypted-prisma-adapter";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { isRole, type Role } from "../domain/role";
import { UserLoggedIn, UserRegistered } from "../domain/events";
import { PrismaAccountRepository } from "./account.repository";
import { verifyCode } from "./verification-code";
import { authorizeRoute } from "./public-paths";
import { assertLoginRateLimitFromRequest, RateLimitError } from "./login-rate-limit";

export class RateLimitAuthError extends CredentialsSignin {
  code = "rateLimit";
  constructor(public readonly retryAfterMs: number) {
    super();
  }
}

class UnverifiedEmailError extends CredentialsSignin {
  code = "unverifiedEmail";
}

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

      try {
        await assertLoginRateLimitFromRequest(request, email);
      } catch (error) {
        if (error instanceof RateLimitError) {
          throw new RateLimitAuthError(error.retryAfterMs);
        }
        throw error;
      }

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

      if (env.REQUIRE_EMAIL_VERIFICATION && !account.emailVerified) {
        throw new UnverifiedEmailError();
      }

      if (account.isSuperAdmin) {
        if (!mfaCode) return null;
        const codeValid = await verifyCode(email, mfaCode, "mfa");
        if (!codeValid) return null;
      }

      if (account.suspendedAt || account.banned) {
        logger.warn("auth.blocked", { email, suspended: !!account.suspendedAt, banned: account.banned });
        return null;
      }

      return {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        isSuperAdmin: account.isSuperAdmin,
        emailVerified: account.emailVerified,
        userId: account.userId,
        projectId: account.projectId,
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
    emailVerified: fresh.emailVerified,
    userId: fresh.userId,
    projectId: fresh.projectId,
    tokenVersion: fresh.tokenVersion,
  };
}

export const authConfig: NextAuthConfig = {
  adapter: EncryptedPrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  // Auth.js v5 only auto-trusts on Vercel; on Fly.io/Docker the Host header
  // must be trusted or every /api/auth/* route returns 500 UntrustedHost.
  trustHost: env.AUTH_TRUST_HOST,
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.userId =
          typeof user.userId === "string" ? user.userId : null;
        token.email = user.email;
        token.name = user.name;
        token.projectId =
          typeof user.projectId === "string" ? user.projectId : null;
        // OAuth users do not go through the email/password registration flow,
        // so they may not have an organization. Provision one synchronously
        // before the JWT is issued so the token carries the tenant claim.
        if (account?.provider !== "credentials" && typeof user.id === "string") {
          const existing = await accounts.findById(user.id);
          if (existing && user.email) {
            await eventBus.publish(
              new UserRegistered(user.id, {
                userId: user.id,
                email: user.email,
                role: "USER",
                autoProvisionOrganization: true,
              }),
            );
          }
        }
        // Always hydrate from the database so the token carries the current
        // canonical claims (role, userId, projectId, tokenVersion).
        const refreshed = await refreshTokenFromDb(token);
        if (!refreshed) return token;
        return refreshed;
      }
      if (trigger === "update" && typeof token.id === "string") {
        const update = session as { user?: { impersonatedUserId?: string | null } } | undefined;
        const impersonatedUserId = update?.user?.impersonatedUserId;
        if (impersonatedUserId === null) {
          delete token.impersonatedUserId;
        } else if (typeof impersonatedUserId === "string") {
          token.impersonatedUserId = impersonatedUserId;
        }
        const refreshed = await refreshTokenFromDb(token);
        if (!refreshed) return token;
        return refreshed;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        const admin = await accounts.findById(token.id);
        if (
          !admin ||
          admin.suspendedAt ||
          admin.banned ||
          (typeof token.tokenVersion === "number" &&
            admin.tokenVersion !== token.tokenVersion)
        ) {
          return { expires: new Date(0).toISOString() };
        }

        if (typeof token.impersonatedUserId === "string") {
          const target = await accounts.findById(token.impersonatedUserId);
          if (!target || target.suspendedAt || target.banned) {
            return { expires: new Date(0).toISOString() };
          }

          session.user.id = target.id;
          session.user.email = target.email;
          session.user.name = target.name;
          session.user.role = isRole(target.role)
            ? (target.role as Role)
            : "USER";
          session.user.isSuperAdmin = target.isSuperAdmin;
          session.user.emailVerified = target.emailVerified;
          session.user.userId =
            typeof target.userId === "string" ? target.userId : null;
          session.user.projectId =
            typeof target.projectId === "string" ? target.projectId : null;
          session.user.phone = target.phone;
          session.user.phoneVerified = target.phoneVerified;
          session.user.suspendedAt = target.suspendedAt ?? null;
          session.user.banned = target.banned ?? false;
          session.user.tokenVersion = target.tokenVersion;
          session.user.impersonatedBy = token.id;
          session.user.isImpersonating = true;
        } else {
          session.user.id = token.id;
          session.user.role = isRole(token.role)
            ? (token.role as Role)
            : "USER";
          session.user.userId =
            typeof token.userId === "string" ? token.userId : null;
          session.user.isSuperAdmin =
            typeof token.isSuperAdmin === "boolean" ? token.isSuperAdmin : false;
          session.user.emailVerified =
            token.emailVerified instanceof Date
              ? token.emailVerified
              : typeof token.emailVerified === "string"
                ? new Date(token.emailVerified)
                : null;
          session.user.projectId =
            typeof token.projectId === "string" ? token.projectId : null;
          session.user.phone = admin.phone;
          session.user.phoneVerified = admin.phoneVerified;
          session.user.suspendedAt = admin.suspendedAt ?? null;
          session.user.banned = admin.banned ?? false;
          session.user.tokenVersion =
            typeof token.tokenVersion === "number" ? token.tokenVersion : 0;
          session.user.impersonatedBy = null;
          session.user.isImpersonating = false;
        }
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      // Only same-origin redirects; a spoofed Host must not steer the callback.
      const canonical = new URL(env.APP_URL ?? baseUrl);
      const target = new URL(url, canonical);
      return target.origin === canonical.origin
        ? target.toString()
        : canonical.toString();
    },
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      // Admin routes require a super admin session; otherwise redirect to the dashboard.
      if (pathname.startsWith("/admin") && auth?.user && !auth.user.isSuperAdmin) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      const decision = authorizeRoute(pathname, !!auth?.user);
      if (decision.kind === "allow") return true;
      return NextResponse.redirect(new URL(decision.location, request.url));
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

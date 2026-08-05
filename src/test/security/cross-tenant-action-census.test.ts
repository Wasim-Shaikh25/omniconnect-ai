import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ROOT = new URL("../../modules", import.meta.url).pathname;

const AUTH_GUARDS = [
  "getCurrentUser",
  "requireUser",
  "requireRole",
  "requireSuperAdmin",
];

const TENANT_GUARDS = [
  "tenantGuard",
  "assertStoreInOrg",
  "guardStoreAccess",
  "resolveStoreScope",
  "assertCustomerInOrg",
  "assertOrganizationAccess",
  "requireStoreAccess",
];

const ALLOWLIST: Record<string, string> = {
  // Unauthenticated auth flows by design.
  "src/modules/auth/presentation/actions.ts:registerAction": "public registration",
  "src/modules/auth/presentation/actions.ts:signOutAction": "NextAuth signOut helper",
  "src/modules/auth/presentation/actions.ts:oauthSignInAction": "public OAuth init",
  "src/modules/auth/presentation/actions.ts:loginAction": "public login",
  "src/modules/auth/presentation/actions.ts:requestPasswordResetAction": "public password reset request",
  "src/modules/auth/presentation/actions.ts:resetPasswordAction": "token-based password reset",
  "src/modules/auth/presentation/actions.ts:resendVerificationEmailAction": "public resend verification email",
};

function actionFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...actionFiles(full));
    } else if (full.endsWith("/presentation/actions.ts") || full.endsWith("/presentation/actions.tsx")) {
      result.push(full);
    }
  }
  return result;
}

function hasAny(source: string, names: string[]): boolean {
  return names.some((n) => source.includes(n));
}

describe("cross-tenant action census (S2)", () => {
  it("every exported async *Action calls an auth or tenant guard", () => {
    const files = actionFiles(ROOT);
    expect(files.length).toBeGreaterThan(0);

    const missing: string[] = [];
    const allowed: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);

      function visit(node: ts.Node) {
        if (
          ts.isFunctionDeclaration(node) &&
          node.name?.getText(sf).endsWith("Action") &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
        ) {
          const text = node.getText(sf);
          const name = node.name.getText(sf);
          const key = `${file.replace(/^.*src\//, "src/")}:${name}`;
          const hasAuthGuard = hasAny(text, AUTH_GUARDS);
          const hasTenantGuard = hasAny(text, TENANT_GUARDS);
          const hasStoreId = text.includes("projectId");
          const hasOrgScope = text.includes("user.userId");
          const safe =
            hasTenantGuard ||
            (hasAuthGuard && hasOrgScope) ||
            (hasAuthGuard && !hasStoreId);

          if (!safe) {
            if (ALLOWLIST[key]) {
              allowed.push(`${key} (${ALLOWLIST[key]})`);
            } else {
              missing.push(key);
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
    }

    if (missing.length > 0) {
      console.error("Missing guard actions:\n" + missing.join("\n"));
    }
    expect(missing, `Actions missing auth/tenant guard: ${missing.join(", ")}`).toEqual([]);
  });
});

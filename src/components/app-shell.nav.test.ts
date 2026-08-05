import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dirname, "app-shell.tsx"), "utf8");
const APP_DIR = join(import.meta.dirname, "../../src/app");

function walkPageRoutes(dir: string, out: string[] = [], prefix = ""): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walkPageRoutes(path, out, `${prefix}/${name}`);
    } else if (name === "page.tsx" || name === "page.ts") {
      out.push(prefix || "/");
    }
  }
  return out;
}

function normalizeRoute(route: string): string {
  // Remove route groups (none currently) and trailing slash.
  return route.replace(/\/?\(.*?\)/g, "").replace(/\/$/, "") || "/";
}

function isAllowed(route: string): boolean {
  const allow = [
    "/",
    "/login",
    "/register",
    "/onboarding",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/pricing",
  ];
  const allowedPrefixes = [
    "/admin",
    "/settings",
    "/customers/[customerId]",
    "/stores/[projectId]",
  ];
  if (allow.includes(route)) return true;
  return allowedPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function navHrefs(): string[] {
  const hrefs = new Set<string>();
  const regex = /href:\s*"(\/[^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(SOURCE)) !== null) {
    hrefs.add(match[1]);
  }
  return [...hrefs].sort();
}

function activeCount(pathname: string, hrefs: string[]): number {
  return hrefs.filter((href) => pathname === href).length;
}

describe("app-shell navigation (L2/L3)", () => {
  it("links /support and /analytics/journeys", () => {
    const hrefs = navHrefs();
    expect(hrefs).toContain("/support");
    expect(hrefs).toContain("/analytics/journeys");
  });

  it("does not contain duplicate nav destinations", () => {
    const hrefs = navHrefs();
    const seen = new Set<string>();
    const duplicates = hrefs.filter((href) => {
      if (seen.has(href)) return true;
      seen.add(href);
      return false;
    });
    expect(duplicates).toEqual([]);
  });

  it("has at most one active nav item for sample routes", () => {
    const hrefs = navHrefs();
    const routes = ["/dashboard", "/stores", "/customers", "/business-brain", "/inbox", "/analytics", "/analytics/journeys", "/settings", "/support", "/help"];
    for (const route of routes) {
      expect(activeCount(route, hrefs), `multiple active items for ${route}`).toBeLessThanOrEqual(1);
    }
  });

  it("covers every page route or leaves it on the allow-list (L2.5)", () => {
    const hrefs = new Set(navHrefs());
    const routes = walkPageRoutes(APP_DIR).map(normalizeRoute);
    const orphans = routes.filter((route) => !hrefs.has(route) && !isAllowed(route));
    expect(orphans).toEqual([]);
  });
});

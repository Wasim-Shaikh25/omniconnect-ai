import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ADMIN_DIR = new URL(".", import.meta.url).pathname;

function pageFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...pageFiles(full));
    } else if (entry === "page.tsx") {
      result.push(full);
    }
  }
  return result;
}

describe("admin pages", () => {
  it("every admin page calls requireSuperAdmin", () => {
    const pages = pageFiles(ADMIN_DIR);
    expect(pages.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const file of pages) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("requireSuperAdmin")) {
        missing.push(file);
      }
    }
    expect(missing, `Admin pages missing requireSuperAdmin: ${missing.join(", ")}`).toEqual([]);
  });

  it("requireSuperAdmin is called before any admin data fetch (M11)", () => {
    const pages = pageFiles(ADMIN_DIR);
    const violations: string[] = [];
    for (const file of pages) {
      const source = readFileSync(file, "utf8");
      const fnStart = source.indexOf("export default async function");
      const body = fnStart === -1 ? source : source.slice(fnStart);
      const guardIndex = body.indexOf("await requireSuperAdmin()");
      if (guardIndex === -1) {
        violations.push(`${file}: missing await requireSuperAdmin()`);
        continue;
      }
      const adminActionMatch = /\b(listAll|get|create|update|toggle)[A-Za-z]+Action\b/.exec(body);
      if (adminActionMatch && adminActionMatch.index < guardIndex) {
        violations.push(`${file}: admin action before requireSuperAdmin`);
      }
    }
    expect(violations).toEqual([]);
  });
});

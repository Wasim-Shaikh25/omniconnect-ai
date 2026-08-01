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
});

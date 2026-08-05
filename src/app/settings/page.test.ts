import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

function extractHrefs(source: string): string[] {
  const matches = source.matchAll(/<Link href="([^"]+)"/g);
  return Array.from(matches).map((m) => m[1]);
}

async function enumeratePageRoutes(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const routes: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const name = entry.name;
      if (name.startsWith("(")) continue;
      const segment = name.startsWith("_") ? "" : `/${name}`;
      routes.push(...(await enumeratePageRoutes(join(dir, name), `${prefix}${segment}`)));
    } else if (entry.isFile() && (entry.name === "page.tsx" || entry.name === "page.ts")) {
      routes.push(prefix || "/");
    }
  }

  return routes;
}

describe("settings page links", () => {
  it("every settings link resolves to an existing route", async () => {
    const source = await readFile("src/app/settings/page.tsx", "utf8");
    const hrefs = extractHrefs(source);
    const routes = await enumeratePageRoutes("src/app");
    const missing = hrefs.filter((h) => !routes.includes(h));
    expect(missing).toEqual([]);
  });
});

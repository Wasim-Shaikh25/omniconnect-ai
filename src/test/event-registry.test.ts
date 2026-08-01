import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REGISTRY_PATH = join(import.meta.dirname, "../../docs/specs/event-registry.json");

function extractNames(pattern: RegExp, source: string): string[] {
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path, out);
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  return walk(dir).filter((p) => !p.includes("/test/"));
}

describe("event registry (L1)", () => {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const entries: Array<{ name: string; status: "Live" | "Planned"; reqId?: string; subscribers: string[] }> =
    registry.events;

  it("contains every declared domain event", () => {
    const declared = new Set<string>();
    const src = join(import.meta.dirname, "../../src");
    for (const file of sourceFiles(src)) {
      if (file.includes("/domain/events.ts")) {
        const source = readFileSync(file, "utf8");
        for (const name of extractNames(/readonly\s+name\s*=\s*"([A-Za-z]+)"/g, source)) {
          declared.add(name);
        }
      }
    }

    const registryNames = new Set(entries.map((e) => e.name));
    const missing = [...declared].filter((n) => n !== "TestEvent" && !registryNames.has(n));
    expect(missing).toEqual([]);
  });

  it("marks every subscribed event as Live", () => {
    const subscribed = new Set<string>();
    const src = join(import.meta.dirname, "../../src");
    for (const file of sourceFiles(src)) {
      const source = readFileSync(file, "utf8");
      for (const name of extractNames(/subscribe\(\s*"([A-Za-z]+)"/g, source)) {
        if (name === "TestEvent") continue;
        subscribed.add(name);
      }
    }

    const live = new Set(entries.filter((e) => e.status === "Live").map((e) => e.name));
    const missing = [...subscribed].filter((n) => !live.has(n));
    expect(missing).toEqual([]);
  });

  it("links every Planned event to a requirement", () => {
    const planned = entries.filter((e) => e.status === "Planned");
    const missing = planned.filter((e) => !e.reqId || !/^REQ-\d{4}/.test(e.reqId));
    expect(missing.map((e) => e.name)).toEqual([]);
  });
});

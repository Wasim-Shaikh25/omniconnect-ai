import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = join(import.meta.dirname ?? ".", "..", "src");

const MODULE_REQ: Record<string, string> = {
  ai: "REQ-0004",
  analytics: "REQ-0020",
  auth: "REQ-0001",
  branddeals: "REQ-0039",
  commerce: "REQ-0002",
  content: "REQ-0018",
  conversations: "REQ-0016",
  coupons: "REQ-0023",
  crm: "REQ-0006",
  ecommerce: "REQ-0002",
  growth: "REQ-0013",
  intelligence: "REQ-0007",
  meta: "REQ-0003",
  notifications: "REQ-0009",
  organizations: "REQ-0011",
  reports: "REQ-0025",
  social: "REQ-0003",
  users: "REQ-0011",
};

function walk(dir: string, pattern: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      out.push(...walk(path, pattern));
    } else if (pattern.test(path)) {
      out.push(path);
    }
  }
  return out;
}

function extractDeclaredEvents(source: string): string[] {
  const names = new Set<string>();
  const regex = /readonly\s+name\s*=\s*"([A-Za-z]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function extractSubscribedEvents(source: string): string[] {
  const names = new Set<string>();
  const regex = /subscribe\(\s*"([A-Za-z]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function moduleFor(path: string): string {
  const parts = relative(SRC_DIR, path).split(/[\\/]/);
  return parts[1] ?? "unknown";
}

const domainFiles = walk(SRC_DIR, /\/domain\/events\.ts$/);
const subscriberFiles = walk(SRC_DIR, /\.ts$/).filter((p) => !p.endsWith(".test.ts"));

const declared = new Map<string, { module: string; file: string }>();
for (const file of domainFiles) {
  const source = readFileSync(file, "utf8");
  const mod = moduleFor(file);
  for (const name of extractDeclaredEvents(source)) {
    declared.set(name, { module: mod, file: relative(SRC_DIR, file) });
  }
}

const subscribers = new Map<string, string[]>();
for (const file of subscriberFiles) {
  const source = readFileSync(file, "utf8");
  for (const name of extractSubscribedEvents(source)) {
    if (!subscribers.has(name)) subscribers.set(name, []);
    subscribers.get(name)!.push(relative(SRC_DIR, file));
  }
}

const registry = [...declared.entries()].map(([name, meta]) => {
  const subs = subscribers.get(name) ?? [];
  const status = subs.length > 0 ? "Live" : "Planned";
  const reqId = MODULE_REQ[meta.module] ?? "REQ-0069";
  return {
    name,
    module: meta.module,
    file: meta.file,
    status,
    reqId,
    subscribers: subs,
  };
});

writeFileSync(
  join(SRC_DIR, "..", "docs", "specs", "event-registry.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: registry.length, events: registry }, null, 2),
);

const rows = registry
  .map(
    (e) =>
      `| ${e.name} | ${e.module} | ${e.status} | ${e.reqId} | ${
        e.subscribers.length > 0 ? e.subscribers.join(", ") : "—"
      } |`,
  )
  .join("\n");

const md = `# Domain Event Registry

Generated at ${new Date().toISOString()}.

| Event | Module | Status | Requirement | Subscribers |
|-------|--------|--------|-------------|-------------|
${rows}

- **Live** events have at least one subscriber.
- **Planned** events are declared but not yet subscribed; each is linked to the requirement that owns the module.
`;

writeFileSync(join(SRC_DIR, "..", "docs", "specs", "event-registry.md"), md);

console.log(`Wrote ${registry.length} events to docs/specs/event-registry.{json,md}`);

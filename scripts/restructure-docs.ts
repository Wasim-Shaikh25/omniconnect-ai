#!/usr/bin/env node
/**
 * restructure-docs.ts
 *
 * One-time migration of the legacy `docs/specs/<id>-<slug>.md` feature specs into the
 * unified requirement/task/tracker structure:
 *
 *   docs/specs/<id>-<slug>.md        -> docs/requirements/REQ-<id>-<slug>.md
 *   docs/tasks/<id>-<slug>-progress.md -> docs/trackers/TRACKER-<id>-<slug>.md
 *   (new)                              -> docs/tasks/TASK-<id>-<slug>.md
 *
 * It also updates internal cross-references inside the moved documents and in
 * `docs/specs/current-state.md` and `CHANGELOG.md`.
 *
 * Usage:
 *   npx tsx scripts/restructure-docs.ts [--dry-run]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(process.cwd());
const SPECS_DIR = path.join(ROOT, "docs/specs");
const TASKS_DIR = path.join(ROOT, "docs/tasks");
const REQ_DIR = path.join(ROOT, "docs/requirements");
const TRACKER_DIR = path.join(ROOT, "docs/trackers");
const NEW_TASK_DIR = path.join(ROOT, "docs/tasks");

const DRY_RUN = process.argv.includes("--dry-run");

interface SpecMeta {
  id: string;
  slug: string;
  filename: string;
  title: string;
  status: string;
  modules: string;
  owner: string;
  content: string;
}

function ensureDir(dir: string) {
  if (!DRY_RUN && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseSpecFile(filePath: string): SpecMeta | null {
  const filename = path.basename(filePath);
  const match = filename.match(/^(\d{3,4})-(.+)\.md$/);
  if (!match) return null;
  const [, idStr, slug] = match;
  const id = idStr!;

  const content = fs.readFileSync(filePath, "utf-8");
  const titleMatch = content.match(/^#\s*(?:Spec\s+\d+:\s*)?(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? slug.replace(/-/g, " ");

  const statusMatch = content.match(/^-\s*\*\*Status:\*\*\s*(.+)$/m);
  const status = statusMatch?.[1]?.trim() ?? "Draft";

  const modulesMatch = content.match(/^-\s*\*\*Module\(s\):\*\*\s*(.+)$/m);
  const modules = modulesMatch?.[1]?.trim() ?? "all";

  const ownerMatch = content.match(/^-\s*\*\*Owner:\*\*\s*(.+)$/m);
  const owner = ownerMatch?.[1]?.trim() ?? "Devin";

  return { id, slug, filename, title, status, modules, owner, content };
}

function isImplemented(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("implemented") || s.includes("done") || s.includes("complete");
}

function rewriteRefs(content: string, id: string, slug: string): string {
  // Update references to other legacy specs -> requirements
  const specRef = new RegExp(
    `(\\]?\\(?|\\\\)docs/specs/${id}-(${slug}|[^\\s\\)\\]]+)\\.md`,
    "g",
  );
  // Generic replacement for any docs/specs/<id>-<slug>.md to docs/requirements/REQ-<id>-<slug>.md
  return content
    .replace(/docs\/specs\/(\d{3,4})-([A-Za-z0-9\-]+)\.md/g, "docs/requirements/REQ-$1-$2.md")
    .replace(/\.\.\/specs\/(\d{3,4})-([A-Za-z0-9\-]+)\.md/g, "../requirements/REQ-$1-$2.md")
    .replace(/docs\/tasks\/(\d{3,4})-([A-Za-z0-9\-]+)-progress\.md/g, "docs/trackers/TRACKER-$1-$2.md")
    .replace(/\.\.\/tasks\/(\d{3,4})-([A-Za-z0-9\-]+)-progress\.md/g, "../trackers/TRACKER-$1-$2.md");
}

function findProgressFile(id: string, slug: string): string | null {
  const candidates = [
    path.join(TASKS_DIR, `${id}-${slug}-progress.md`),
    path.join(TASKS_DIR, `${id}-progress.md`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // try any file matching id prefix
  if (fs.existsSync(TASKS_DIR)) {
    for (const entry of fs.readdirSync(TASKS_DIR)) {
      if (entry.startsWith(`${id}-`) && entry.endsWith("-progress.md")) {
        return path.join(TASKS_DIR, entry);
      }
    }
  }
  return null;
}

function buildRequirement(meta: SpecMeta): string {
  const date = new Date().toISOString().split("T")[0];
  let body = rewriteRefs(meta.content, meta.id, meta.slug);
  // Strip the original H1; we provide a new REQ heading.
  body = body.replace(/^#\s+.*\r?\n?/m, "");
  const header = `---
description: ${meta.title}
---

# REQ-${meta.id}: ${meta.title}

- **Status:** ${isImplemented(meta.status) ? "Implemented" : meta.status}
- **Owner:** ${meta.owner}
- **Module(s):** ${meta.modules}
- **Original spec path:** \`docs/specs/${meta.filename}\` (restructured)
- **Task:** \`docs/tasks/TASK-${meta.id}-${meta.slug}.md\`
- **Tracker:** \`docs/trackers/TRACKER-${meta.id}-${meta.slug}.md\`
- **Last updated:** ${date}

> This file was migrated from \`docs/specs/${meta.filename}\` as part of the unified requirement/task/tracker restructure. The original content is preserved below.

`;
  return header + body;
}

function buildTask(meta: SpecMeta): string {
  const date = new Date().toISOString().split("T")[0];
  const done = isImplemented(meta.status) ? "Done" : "Todo";
  return `# TASK-${meta.id}: ${meta.title}

- **Status:** ${done}
- **Owner:** ${meta.owner}
- **Module(s):** ${meta.modules}
- **Requirement:** \`docs/requirements/REQ-${meta.id}-${meta.slug}.md\`
- **Tracker:** \`docs/trackers/TRACKER-${meta.id}-${meta.slug}.md\`
- **Changelog entry:** See \`CHANGELOG.md\` for TASK-${meta.id}.
- **Last updated:** ${date}

## 1. Summary

Implementation task for REQ-${meta.id}. Implementation details and code references were captured in the original spec and should be expanded here as work is touched.

## 2. References

- Requirement: \`docs/requirements/REQ-${meta.id}-${meta.slug}.md\`
- Tracker: \`docs/trackers/TRACKER-${meta.id}-${meta.slug}.md\`

## 3. Implementation Plan

- Review the requirement and original design.
- Identify affected modules, pages, and repositories.
- Implement changes, respecting DDD module boundaries.
- Add/update tests and run quality gates.

## 4. Subtasks

- [ ] Review requirement and current state.
- [ ] Implement or verify implementation.
- [ ] Update \`docs/specs/current-state.md\` if contracts changed.
- [ ] Update \`CHANGELOG.md\`.
- [ ] Run lint + typecheck + tests + build.

## 5. Acceptance Criteria

- [ ] Matches the linked requirement.
- [ ] Quality gates pass.
- [ ] \`CHANGELOG.md\` updated if needed.

## 6. Notes / Blockers

- Migrated from legacy spec \`docs/specs/${meta.filename}\`.
`;
}

function buildTrackerFromProgress(progressPath: string, meta: SpecMeta): string {
  const content = fs.readFileSync(progressPath, "utf-8");
  const updated = rewriteRefs(content, meta.id, meta.slug)
    .replace(/^#\s+.+$/m, `# TRACKER-${meta.id}: ${meta.title}`)
    .replace(
      /^-\s*\*\*Spec:\*\*.+$/m,
      `- **Requirement:** \`docs/requirements/REQ-${meta.id}-${meta.slug}.md\`\n- **Task:** \`docs/tasks/TASK-${meta.id}-${meta.slug}.md\``,
    );
  return updated;
}

function buildTracker(meta: SpecMeta): string {
  const date = new Date().toISOString().split("T")[0];
  const done = isImplemented(meta.status);
  const acRegex = /^\s*-\s*\[([ xX])\]\s*(.+)$/gm;
  const ac: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = acRegex.exec(meta.content)) !== null) {
    ac.push(m[2]!);
  }
  const acItems = ac.length > 0 ? ac.map((c) => `- [${done ? "x" : " "}] ${c}`).join("\n") : "";

  return `# TRACKER-${meta.id}: ${meta.title}

- **Status:** ${done ? "Done" : "Todo"}
- **Owner:** ${meta.owner}
- **Requirement:** \`docs/requirements/REQ-${meta.id}-${meta.slug}.md\`
- **Task:** \`docs/tasks/TASK-${meta.id}-${meta.slug}.md\`
- **Last updated:** ${date}

## 1. Summary

Progress tracker for REQ-${meta.id}.

## 2. Subtasks

### Planning
- [${done ? "x" : " "}] Requirement approved and task created.

### Implementation / Verification
${acItems || `- [${done ? "x" : " "}] Implementation complete.`}

### Quality Gates
- [${done ? "x" : " "}] \`npm run lint\` passes.
- [${done ? "x" : " "}] \`npm run typecheck\` passes.
- [${done ? "x" : " "}] \`npm run test\` passes.
- [${done ? "x" : " "}] \`npm run build\` passes.
- [${done ? "x" : " "}] \`CHANGELOG.md\` updated.

## 3. Acceptance Criteria

- [${done ? "x" : " "}] All linked requirement acceptance criteria are met.
- [${done ? "x" : " "}] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec \`docs/specs/${meta.filename}\`.
`;
}

function main() {
  if (!fs.existsSync(SPECS_DIR)) {
    console.error("docs/specs directory not found");
    process.exit(1);
  }

  ensureDir(REQ_DIR);
  ensureDir(TRACKER_DIR);
  ensureDir(NEW_TASK_DIR);

  const skipped = ["README.md", "_TEMPLATE.md", "current-state.md"];
  const entries = fs.readdirSync(SPECS_DIR, { withFileTypes: true });
  const movedIds: { id: string; slug: string }[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (skipped.includes(entry.name)) continue;

    const specPath = path.join(SPECS_DIR, entry.name);
    const meta = parseSpecFile(specPath);
    if (!meta) {
      console.log(`SKIP (unparseable): ${entry.name}`);
      continue;
    }

    const reqFile = path.join(REQ_DIR, `REQ-${meta.id}-${meta.slug}.md`);
    const taskFile = path.join(NEW_TASK_DIR, `TASK-${meta.id}-${meta.slug}.md`);
    const trackerFile = path.join(TRACKER_DIR, `TRACKER-${meta.id}-${meta.slug}.md`);

    if (DRY_RUN) {
      console.log(`WOULD RESTRUCTURE: ${meta.id} -> REQ-${meta.id}, TASK-${meta.id}, TRACKER-${meta.id}`);
      continue;
    }

    // Requirement
    fs.writeFileSync(reqFile, buildRequirement(meta), "utf-8");
    fs.unlinkSync(specPath);

    // Task
    fs.writeFileSync(taskFile, buildTask(meta), "utf-8");

    // Tracker (from legacy progress if exists, else generic)
    const progressPath = findProgressFile(meta.id, meta.slug);
    if (progressPath) {
      fs.writeFileSync(trackerFile, buildTrackerFromProgress(progressPath, meta), "utf-8");
      fs.unlinkSync(progressPath);
    } else {
      fs.writeFileSync(trackerFile, buildTracker(meta), "utf-8");
    }

    console.log(`RESTRUCTURED: ${meta.id} -> REQ-${meta.id}, TASK-${meta.id}, TRACKER-${meta.id}`);
    movedIds.push({ id: meta.id, slug: meta.slug });
  }

  // Update current-state.md and CHANGELOG.md references
  const updateFiles = [path.join(ROOT, "docs/specs/current-state.md"), path.join(ROOT, "CHANGELOG.md")];
  for (const file of updateFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    const updated = rewriteRefs(content, "", "");
    if (updated !== content) {
      if (DRY_RUN) {
        console.log(`WOULD UPDATE: ${path.relative(ROOT, file)}`);
      } else {
        fs.writeFileSync(file, updated, "utf-8");
        console.log(`UPDATED: ${path.relative(ROOT, file)}`);
      }
    }
  }

  console.log(`\nRestructured ${movedIds.length} spec(s).`);
}

main();

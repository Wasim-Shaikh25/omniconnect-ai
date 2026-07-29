#!/usr/bin/env node
/**
 * task-status.ts
 *
 * Scans the docs/requirements, docs/tasks, and docs/trackers directories,
 * validates that every REQ has a TASK and TRACKER, computes completion
 * percentages, and prints a clear status report.
 *
 * Usage:
 *   npx tsx scripts/task-status.ts
 *   npx tsx scripts/task-status.ts --summary   # table + totals only
 *   npx tsx scripts/task-status.ts --fail      # exit 1 if any pending work
 *   npx tsx scripts/task-status.ts --json       # machine-readable output
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname ?? "..", "..");

// Ignore broken pipe when the user pipes output to `head`.
process.stdout.on("error", () => {});
process.stderr.on("error", () => {});

interface Item {
  id: string;
  slug: string;
  title: string;
  file: string;
  status?: string;
}

interface Tracker {
  item: Item;
  total: number;
  done: number;
  pending: string[];
  status?: string;
}

function parseId(fileName: string): { id: string; prefix: string; slug: string } | null {
  const match = fileName.match(/^(REQ|TASK|TRACKER)-(\d+)[\-\.](.+?)\.md$/i);
  if (!match) return null;
  return { prefix: match[1]!.toUpperCase(), id: match[2]!, slug: match[3] ?? "" };
}

function parseStatus(content: string): string {
  const match = content.match(/^-\s*\*\*Status:\*\*\s*(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function scanDir(dir: string, prefix: string): Map<string, Item> {
  const result = new Map<string, Item>();
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return result;

  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const parsed = parseId(entry.name);
    if (!parsed || parsed.prefix !== prefix) continue;
    const filePath = path.join(fullDir, entry.name);
    const content = fs.readFileSync(filePath, "utf-8");
    result.set(parsed.id, {
      id: parsed.id,
      slug: parsed.slug,
      title: extractTitle(content),
      file: filePath,
      status: prefix === "REQ" ? parseStatus(content) : undefined,
    });
  }
  return result;
}

function parseTracker(filePath: string): { total: number; done: number; pending: string[]; status?: string } {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const pending: string[] = [];
  let total = 0;
  let done = 0;

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.+)$/);
    if (!match) continue;
    total++;
    const checked = match[2]!.toLowerCase() === "x";
    if (checked) {
      done++;
    } else {
      pending.push(match[3]!.trim());
    }
  }

  return { total, done, pending, status: parseStatus(content) };
}

function safeWrite(line: string) {
  try {
    process.stdout.write(line + "\n");
  } catch {
    // ignore broken pipe when user pipes to `head`
  }
}

function main() {
  const args = process.argv.slice(2);
  const failMode = args.includes("--fail");
  const jsonMode = args.includes("--json");
  const summaryMode = args.includes("--summary");

  const requirements = scanDir("docs/requirements", "REQ");
  const tasks = scanDir("docs/tasks", "TASK");
  const trackers = scanDir("docs/trackers", "TRACKER");

  const report: Record<string, Tracker & { requirement?: Item; task?: Item; id: string }> = {};
  const missing: string[] = [];
  const orphanedTasks: string[] = [];
  const orphanedTrackers: string[] = [];
  const trackerRecords: Tracker[] = [];

  // Validate requirements
  for (const [id, req] of requirements) {
    const task = tasks.get(id);
    const tracker = trackers.get(id);

    if (!task) missing.push(`TASK-${id} missing for REQ-${id}`);
    if (!tracker) missing.push(`TRACKER-${id} missing for REQ-${id}`);

    if (tracker) {
      const stats = parseTracker(tracker.file);
      const record = { ...stats, id, item: tracker, requirement: req, task };
      report[id] = record;
      trackerRecords.push(record);
    }
  }

  // Warn about orphaned legacy task/tracker files not linked to a requirement
  for (const [id, task] of tasks) {
    if (!requirements.has(id)) orphanedTasks.push(`${path.relative(ROOT, task.file)}`);
  }
  for (const [id, tracker] of trackers) {
    if (!requirements.has(id)) orphanedTrackers.push(`${path.relative(ROOT, tracker.file)}`);
  }

  if (jsonMode) {
    console.log(JSON.stringify({ report, missing, orphanedTasks, orphanedTrackers }, null, 2));
    process.exit(missing.length > 0 || trackerRecords.some((t) => t.pending.length > 0) ? 1 : 0);
  }

  safeWrite("# OmniConnect AI — Task Status\n");

  if (missing.length > 0) {
    safeWrite("## Missing Files\n");
    for (const m of missing) safeWrite(`- ${m}`);
    safeWrite("");
  }

  if (orphanedTasks.length > 0 || orphanedTrackers.length > 0) {
    safeWrite("## Legacy Orphaned Files (no matching REQ)\n");
    for (const f of orphanedTasks) safeWrite(`- ${f}`);
    for (const f of orphanedTrackers) safeWrite(`- ${f}`);
    safeWrite("");
  }

  safeWrite("| ID | Requirement | Task | Tracker | Req Status | Progress |");
  safeWrite("|----|-------------|------|---------|------------|----------|");

  const sortedIds = Object.keys(report).sort((a, b) => Number(a) - Number(b));
  let doneCount = 0;
  let cancelledCount = 0;

  for (const id of sortedIds) {
    const r = report[id]!;
    const pct = r.total === 0 ? 0 : Math.round((r.done / r.total) * 100);
    const reqStatus = (r.requirement?.status ?? "").toLowerCase();
    const trackerStatusText = (r.status ?? "").toLowerCase();

    const isCancelled = reqStatus === "cancelled" || trackerStatusText === "cancelled";
    const isDone = !isCancelled && pct === 100;

    const trackerStatus = isCancelled
      ? "Cancelled"
      : isDone
        ? "Done"
        : `${pct}% (${r.done}/${r.total})`;

    if (isDone) doneCount++;
    if (isCancelled) cancelledCount++;

    const reqTitle = r.requirement ? `[REQ-${id}](${path.relative(ROOT, r.requirement.file)})` : "—";
    const taskTitle = r.task ? `[TASK-${id}](${path.relative(ROOT, r.task.file)})` : "—";
    const trackTitle = `[TRACKER-${id}](${path.relative(ROOT, r.item.file)})`;

    safeWrite(`| ${id} | ${reqTitle} | ${taskTitle} | ${trackTitle} | ${r.requirement?.status ?? "—"} | ${trackerStatus} |`);
  }

  safeWrite("");
  safeWrite(`**Total:** ${sortedIds.length} | **Done:** ${doneCount} | **Cancelled:** ${cancelledCount} | **Left:** ${sortedIds.length - doneCount - cancelledCount}`);
  safeWrite("");

  if (!summaryMode) {
    const pendingTrackers = trackerRecords.filter((t) => t.pending.length > 0);
    if (pendingTrackers.length > 0) {
      safeWrite("## Pending Items\n");
      for (const t of pendingTrackers) {
        safeWrite(`### TRACKER-${t.item.id}: ${t.item.title}`);
        for (const p of t.pending) safeWrite(`- [ ] ${p}`);
        safeWrite("");
      }
    }
  }

  const leftCount = sortedIds.length - doneCount - cancelledCount;
  if (leftCount > 0 || missing.length > 0) {
    if (failMode) process.exit(1);
  } else {
    safeWrite("All trackers complete. No pending work.");
  }
}

main();

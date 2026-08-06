#!/usr/bin/env node
/**
 * task-status.ts
 *
 * Scans the docs/requirements, docs/tasks, and docs/trackers directories,
 * validates that every REQ has a TASK and TRACKER, computes completion
 * percentages from every checklist in those files, and prints a clear status
 * report.
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

interface Checklist {
  total: number;
  done: number;
  deferred: number;
  pending: string[];
  status?: string;
}

interface TaskRecord {
  id: string;
  requirement?: Item;
  task?: Item;
  tracker: Item;
  req: Checklist;
  taskCheck: Checklist;
  trackerCheck: Checklist;
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
      status: parseStatus(content),
    });
  }
  return result;
}

function parseChecklist(filePath: string): Checklist {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const pending: string[] = [];
  let total = 0;
  let done = 0;
  let deferred = 0;

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s*\[([ xXdD])\]\s*(.+)$/);
    if (!match) continue;
    total++;
    const marker = match[2]!.toLowerCase();
    if (marker === "x") {
      done++;
    } else if (marker === "d") {
      deferred++;
    } else {
      pending.push(match[3]!.trim());
    }
  }

  return { total, done, deferred, pending, status: parseStatus(content) };
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

  const records: TaskRecord[] = [];
  const missing: string[] = [];
  const orphanedTasks: string[] = [];
  const orphanedTrackers: string[] = [];

  // Validate requirements
  for (const [id, req] of requirements) {
    const task = tasks.get(id);
    const tracker = trackers.get(id);

    if (!task) missing.push(`TASK-${id} missing for REQ-${id}`);
    if (!tracker) missing.push(`TRACKER-${id} missing for REQ-${id}`);

    if (tracker) {
      records.push({
        id,
        requirement: req,
        task,
        tracker,
        req: parseChecklist(req.file),
        taskCheck: task ? parseChecklist(task.file) : { total: 0, done: 0, deferred: 0, pending: [] },
        trackerCheck: parseChecklist(tracker.file),
      });
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
    const left = records.filter((r) => !isDone(r) && !isCancelled(r)).length;
    console.log(JSON.stringify({ records, missing, orphanedTasks, orphanedTrackers, left }, null, 2));
    process.exit(missing.length > 0 || left > 0 ? 1 : 0);
  }

  safeWrite("# OmniConnect AI — Task Status\n");

  if (missing.length > 0) {
    safeWrite("## Missing Files");
    for (const m of missing) safeWrite(`- ${m}`);
    safeWrite("");
  }

  if (orphanedTasks.length > 0 || orphanedTrackers.length > 0) {
    safeWrite("## Legacy Orphaned Files (no matching REQ)");
    for (const f of orphanedTasks) safeWrite(`- ${f}`);
    for (const f of orphanedTrackers) safeWrite(`- ${f}`);
    safeWrite("");
  }

  safeWrite("| ID | Requirement | Task | Tracker | Req Status | Req Progress | Task Progress | Tracker Progress |");
  safeWrite("|----|-------------|------|---------|------------|--------------|---------------|------------------|");

  const sortedRecords = records.sort((a, b) => Number(a.id) - Number(b.id));
  let doneCount = 0;
  let cancelledCount = 0;
  let deferredCount = 0;

  for (const r of sortedRecords) {
    const reqPct = progressPct(r.req);
    const taskPct = progressPct(r.taskCheck);
    const trackerPct = progressPct(r.trackerCheck);
    const totalDeferred = r.req.deferred + r.taskCheck.deferred + r.trackerCheck.deferred;

    const reqStatus = (r.requirement?.status ?? "").toLowerCase();
    const trackerStatusText = (r.tracker.status ?? "").toLowerCase();
    const taskStatusText = (r.task?.status ?? "").toLowerCase();

    const isCancelled =
      reqStatus === "cancelled" ||
      reqStatus.startsWith("superseded") ||
      trackerStatusText === "cancelled" ||
      trackerStatusText.startsWith("superseded") ||
      taskStatusText === "cancelled" ||
      taskStatusText.startsWith("superseded");
    const isDone = !isCancelled && reqPct === 100 && taskPct === 100 && trackerPct === 100;

    if (isDone) doneCount++;
    if (isCancelled) cancelledCount++;
    if (totalDeferred > 0 && !isCancelled) deferredCount += totalDeferred;

    const reqTitle = r.requirement ? `[REQ-${r.id}](${path.relative(ROOT, r.requirement.file)})` : "—";
    const taskTitle = r.task ? `[TASK-${r.id}](${path.relative(ROOT, r.task.file)})` : "—";
    const trackTitle = `[TRACKER-${r.id}](${path.relative(ROOT, r.tracker.file)})`;

    const showDeferred = (c: Checklist) => (c.deferred > 0 ? ` (${c.deferred} deferred)` : "");
    safeWrite(
      `| ${r.id} | ${reqTitle} | ${taskTitle} | ${trackTitle} | ${r.requirement?.status ?? "—"} | ${reqPct}% (${r.req.done}/${r.req.total - r.req.deferred}${showDeferred(r.req)}) | ${taskPct}% (${r.taskCheck.done}/${r.taskCheck.total - r.taskCheck.deferred}${showDeferred(r.taskCheck)}) | ${trackerPct}% (${r.trackerCheck.done}/${r.trackerCheck.total - r.trackerCheck.deferred}${showDeferred(r.trackerCheck)}) |`,
    );
  }

  safeWrite("");
  safeWrite(`**Total:** ${sortedRecords.length} | **Done:** ${doneCount} | **Cancelled:** ${cancelledCount} | **Deferred:** ${deferredCount} | **Left:** ${sortedRecords.length - doneCount - cancelledCount}`);
  safeWrite("");

  if (!summaryMode) {
    const pendingRecords = records.filter((r) => !isCancelled(r) && (r.req.pending.length > 0 || r.taskCheck.pending.length > 0 || r.trackerCheck.pending.length > 0));
    if (pendingRecords.length > 0) {
      safeWrite("## Pending Items");
      for (const r of pendingRecords) {
        safeWrite(`### ID ${r.id}: ${r.tracker.title}`);
        for (const p of r.req.pending) safeWrite(`- [ ] REQ: ${p}`);
        for (const p of r.taskCheck.pending) safeWrite(`- [ ] TASK: ${p}`);
        for (const p of r.trackerCheck.pending) safeWrite(`- [ ] TRACKER: ${p}`);
        safeWrite("");
      }
    }
  }

  const leftCount = sortedRecords.length - doneCount - cancelledCount;
  if (leftCount > 0 || missing.length > 0) {
    if (failMode) process.exit(1);
  } else {
    safeWrite("All checklists complete. No pending work.");
  }
}

function progressPct(checklist: Checklist): number {
  const actionable = checklist.total - checklist.deferred;
  return actionable === 0 ? 100 : Math.round((checklist.done / actionable) * 100);
}

function isCancelled(r: TaskRecord): boolean {
  const req = (r.requirement?.status ?? "").toLowerCase();
  const task = (r.task?.status ?? "").toLowerCase();
  const tracker = (r.tracker.status ?? "").toLowerCase();
  return (
    req === "cancelled" ||
    req.startsWith("superseded") ||
    task === "cancelled" ||
    task.startsWith("superseded") ||
    tracker === "cancelled" ||
    tracker.startsWith("superseded")
  );
}

function isDone(r: TaskRecord): boolean {
  return !isCancelled(r) && progressPct(r.req) === 100 && progressPct(r.taskCheck) === 100 && progressPct(r.trackerCheck) === 100;
}

main();

# TASK-0069: Implement Low-Severity Fixes and the Domain-Event Census

- **Status:** Todo
- **Owner:** Backend / Frontend
- **Requirement:** `docs/requirements/REQ-0069-low-severity-and-event-census.md`
- **Tracker:** `docs/trackers/TRACKER-0069-low-severity-and-event-census.md`
- **Module(s):** `ai`, `shared/events`, `shared/observability`, presentation shell, infra config
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Domain-event census, navigation reachability, log-level gating, Fly.io machine policy, case-insensitive AI escalation.
- **Last updated:** 2026-07-31

## 1. Summary

Six small, independent fixes plus one documentation-heavy census. The census (L1) is the largest
item and should be done first because its output determines whether other work exists.

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §4 L1–L7, §3.5, §5 Phase 3
- Requirement: `docs/requirements/REQ-0069-low-severity-and-event-census.md`
- Tracker: `docs/trackers/TRACKER-0069-low-severity-and-event-census.md`

## 3. Implementation Plan

---

### Step 1 — L1: Domain-event census

**Output:** `docs/specs/event-registry.md` + `src/shared/events/event-registry.test.ts`

Generate the raw lists:

```bash
grep -rhoP 'readonly name = "\K[A-Za-z]+' src --include=*.ts | sort -u > /tmp/declared.txt
grep -rhoP 'subscribe\(\s*"\K[A-Za-z]+' src --include=*.ts | sort -u > /tmp/subscribed.txt
comm -23 /tmp/declared.txt /tmp/subscribed.txt   # events with no subscriber
```

At `33e2e0b`: **89 declared, 23 subscribed, ~66 unsubscribed.**

Registry format — one row per event, no exceptions:

```markdown
| Event | Module | Status | Subscriber(s) / Requirement | Notes |
|---|---|---|---|---|
| `NewMessage` | conversations | Live | `ai/infrastructure/subscribers.ts` | Drives AI reply |
| `AbandonedCartDetected` | ecommerce | Planned | `REQ-0067` H7 | Publication moved to the sweep job |
| `SomeDeadEvent` | analytics | Removed | — | Deleted 2026-07-31; no consumer, no roadmap |
```

Classification rule: **Live** (has a subscriber) · **Planned** (no subscriber but a linked REQ id)
· **Removed** (neither — delete the class and its publication sites in this task).

**Note from REQ-0073 (2026-08-01):** no `Project`/`ProjectMember` domain events existed in `src`;
all Project-related code was removed, so no event rows need to be classified as Removed.

Enforcement test:

```typescript
// src/shared/events/event-registry.test.ts
it("every declared domain event is classified in the registry", async () => {
  const declared = await collectDeclaredEventNames("src");
  const registry = await parseEventRegistry("docs/specs/event-registry.md");
  const unclassified = declared.filter((name) => !registry.has(name));
  expect(unclassified).toEqual([]);
});

it("no event is classified Planned without a requirement id", async () => {
  const registry = await parseEventRegistry("docs/specs/event-registry.md");
  for (const [name, row] of registry) {
    if (row.status === "Planned") expect(row.reference).toMatch(/REQ-\d{4}/);
  }
});
```

---

### Step 2 — L2 + L3: Navigation

**File:** `src/components/app-shell.tsx`

Fix the duplicate destination (two entries both pointing at `/stores`), add `/support` and
`/analytics/journeys`, and make active-state matching exact:

```tsx
const isActive = (href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
```

Verify no two entries can both match — add a test that, for a sample of routes, exactly one nav
entry is active.

Replace the index-based admin injection:

```tsx
// before: sections[5]!.items.push(...)
const adminSection = sections.find((section) => section.key === "platform");
if (adminSection && user.isSuperAdmin) {
  adminSection.items.push({ href: "/admin", label: "Admin", icon: Shield });
}
```

Give every section a stable `key`. Removing `sections[5]!` also removes a non-null assertion that
conflicts with `AGENTS.md` §3.

Route-coverage test:

```typescript
// src/components/app-shell.nav.test.ts
const ALLOW_UNLINKED = new Set([
  "/login", "/register", "/onboarding", "/forgot-password", "/reset-password",
  // detail routes reached from a parent list, not the nav:
  "/stores/[storeId]", "/analytics/content/[mediaId]",
]);

it("every page route is reachable from the nav or explicitly allow-listed", async () => {
  const routes = await enumeratePageRoutes("src/app");
  const linked = collectNavHrefs();
  const orphans = routes.filter((r) => !linked.has(r) && !ALLOW_UNLINKED.has(r));
  expect(orphans).toEqual([]);
});
```

---

### Step 3 — L4: Gate debug logging

**Files:** `src/shared/observability/logger.ts:53-58`, `src/shared/config/env.ts`, `.env.example`,
`docs/deployment.md`

```typescript
// src/shared/config/env.ts
LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
```

```typescript
// src/shared/observability/logger.ts
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
const threshold = LEVELS[env.LOG_LEVEL];

function enabled(level: keyof typeof LEVELS): boolean {
  return LEVELS[level] >= threshold;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (!enabled("debug")) return;
    emit("debug", message, meta);
  },
  // info / warn / error unchanged apart from the enabled() guard
};
```

Log a startup warning when `LOG_LEVEL=debug` and `NODE_ENV=production` so it cannot be left on
unnoticed.

---

### Step 4 — L5: Fly.io machine policy

**Files:** `fly.toml`, `docs/deployment.md`, `docs/decisions/`

```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = true
  # A stopped machine has no Redis Pub/Sub subscriber and cold-starts on webhook
  # delivery, which Meta treats as an unhealthy endpoint.
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

Measure before committing to the memory bump: run the standalone bundle under a representative
load and record RSS during SSR plus an AI generation. Record the sizing decision in
`docs/decisions/ADR-XXXX-fly-machine-sizing.md`. Document in `docs/deployment.md` why scale-to-zero
is unsafe for this workload.

---

### Step 5 — L7: Case-insensitive escalation marker

**File:** `src/modules/ai/application/generate-reply.ts:343-346`

```typescript
// includes() is case-sensitive while the strip below uses /gi, so a lowercase
// marker was removed from the text without triggering escalation.
const escalate = /\[ESCALATE\]/i.test(rawReply);
const text = rawReply.replace(/\[ESCALATE\]/gi, "").trim() || FALLBACK_TEXT;
```

Test:

```typescript
it.each(["[ESCALATE]", "[escalate]", "[Escalate]"])(
  "escalates when the model returns %s",
  async (marker) => {
    const result = await generateReply(depsWithModelOutput(`${marker} handing over`));
    expect(result.escalate).toBe(true);
  },
);
```

Inventory other markers parsed from model output:

```bash
grep -rn "includes(\"\[\|match(/\\\[" src/modules/ai
```

Record the results in §6.

---

## 4. Subtasks

- [ ] **L1.1** Generate declared/subscribed/unsubscribed event lists.
- [ ] **L1.2** Create `docs/specs/event-registry.md` with every event classified.
- [ ] **L1.3** Delete events classified **Removed** plus their publication sites.
- [ ] **L1.4** Link a REQ id to every event classified **Planned**.
- [ ] **L1.5** Add the registry-completeness test.
- [ ] **L1.6** Add the "Planned requires a requirement id" test.
- [ ] **L2.1** Add `/support` to the authenticated sidebar.
- [ ] **L2.2** Add `/analytics/journeys` to the analytics nav.
- [ ] **L2.3** Fix the duplicate `/stores` destination.
- [ ] **L2.4** Make active-state matching exact; add the single-active test.
- [ ] **L2.5** Add the route-coverage test with an explicit allow-list.
- [ ] **L3.1** Add stable `key` fields to nav sections.
- [ ] **L3.2** Replace `sections[5]!` with a lookup by key.
- [ ] **L3.3** Add a test that reordering sections does not change behaviour.
- [ ] **L4.1** Add `LOG_LEVEL` to `env.ts`.
- [ ] **L4.2** Gate `logger.debug` (and all levels) behind the threshold.
- [ ] **L4.3** Warn at startup when debug logging is on in production.
- [ ] **L4.4** Document `LOG_LEVEL` in `.env.example` and `docs/deployment.md`.
- [ ] **L4.5** Test: `logger.debug` emits nothing at the default level.
- [x] **L5.1** Set `min_machines_running = 1` and `auto_stop_machines = "off"`. *(PARTIAL — `auto_stop_machines` still `"stop"` in `fly.toml`.)*
- [ ] **L5.2** Measure SSR + AI generation memory; decide the VM size.
- [ ] **L5.3** Record the sizing ADR.
- [ ] **L5.1b** Set `auto_stop_machines = "off"` for the app process in `fly.toml` (or confirm `"stop"` keeps one machine running).
- [ ] **L5.1c** Audit whether `auto_stop_machines = "stop"` combined with `min_machines_running = 1` still permits a cold start on webhook delivery; document the Fly.io semantics.
- [ ] **L5.4** Document the scale-to-zero constraint in `docs/deployment.md`.
- [ ] **L7.1** Switch escalation detection to a case-insensitive regex.
- [ ] **L7.2** Add the three-case unit test.
- [ ] **L7.3** Inventory other AI output markers; record results.

## 5. Acceptance Criteria

- [ ] All `REQ-0069` acceptance criteria are met.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:worker` pass.
- [ ] `docs/specs/current-state.md` links the new event registry.
- [ ] `CHANGELOG.md` updated last.

## 6. Notes / Blockers

- **Count correction:** the audit reports 88 declared events; at `33e2e0b` the count is **89**.
  Use the live `grep` output, not the audit's number.
- **Dependency:** the `AbandonedCartDetected` classification depends on the `REQ-0067` H7 decision.
- **Dependency:** L5's `min_machines_running = 1` is also required by `REQ-0067` H6 — one edit,
  attributed to whichever lands first.
- **Record here during implementation:**
  - The per-event keep/delete decisions summary (L1.4).
  - The AI output-marker inventory (L7.3).
  - Measured memory figures backing the VM sizing decision (L5.2).

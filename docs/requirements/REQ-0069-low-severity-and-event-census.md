# REQ-0069: Low-Severity Findings and Domain-Event Census (L1–L5, L7)

- **Status:** Approved
- **Owner:** Backend / Frontend
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0069-low-severity-and-event-census.md`
- **Related Tracker:** `docs/trackers/TRACKER-0069-low-severity-and-event-census.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §4 (L1–L7), §5 Phase 3
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

## 1. Summary

Six low-severity findings: an unsubscribed-event backlog that hides real gaps, two navigation
defects, a fragile array-index mutation in the app shell, ungated debug logging, a Fly.io
scale-to-zero configuration that conflicts with webhook delivery, and a case-sensitivity bug that
silently drops AI escalation requests. Individually minor; collectively they are the difference
between a system whose gaps are visible and one where they are not.

L6 (no bot protection on registration) is covered by `REQ-0070` §Registration hardening, not here.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| ID | Finding | Verified evidence |
|---|---|---|
| L1 | Unsubscribed events | `grep -rhoP 'readonly name = "\K[A-Za-z]+' src --include=*.ts \| sort -u \| wc -l` → **89**; subscribed → **23**. (The audit reported 88/23; one event has been added since.) |
| L2 | Unreachable nav entries | `/support` and `/analytics/journeys` are absent from `app-shell.tsx` nav; two entries both point to `/stores` and highlight simultaneously |
| L3 | Admin nav injected by index | `app-shell.tsx:126` — `sections[5]!.items.push(…)`; the `!` assertion also conflicts with `AGENTS.md` §3 |
| L4 | Ungated debug logging | `src/shared/observability/logger.ts:53-58` — `logger.debug` emits at all levels |
| L5 | Scale-to-zero vs webhooks | `fly.toml` — `min_machines_running = 0`, `auto_stop_machines = "stop"`, 512 MB shared VM |
| L7 | Case-sensitive escalation marker | `generate-reply.ts:343` — `rawReply.includes("[ESCALATE]")` while line 345 strips with `/gi` |

## 3. Goals

- Make the domain-event surface honest: every declared event is either subscribed, explicitly
  marked as telemetry/forward-looking, or deleted.
- Make every shipped route reachable from the navigation, with correct active-state highlighting.
- Remove the index-based nav mutation and the non-null assertion.
- Gate debug logging behind an explicit level.
- Configure Fly.io so a webhook is never delivered to a stopped machine and the Pub/Sub subscriber
  is always connected.
- Never silently drop an AI escalation request.

## 4. Non-Goals

- Building the features behind the currently-unsubscribed events — this requirement only triages
  and documents them.
- Global search — `REQ-0072`.
- Registration bot protection (L6) — `REQ-0070`.

## 5. User Stories

- As an **engineer**, I can tell from the event registry which events are live, which are planned,
  and which are dead, so a missing subscriber is a visible bug rather than background noise.
- As a **user**, every page the product ships is reachable from the navigation, and the highlighted
  nav item matches the page I am on.
- As a **platform operator**, production logs are not polluted with debug output.
- As a **merchant**, a Meta webhook is acknowledged fast enough that Meta does not mark my
  integration unhealthy.
- As an **end customer**, asking for a human always reaches a human, regardless of how the model
  cased the escalation marker.

## 6. Acceptance Criteria

### L1 — Event census
- [ ] Every declared domain event is classified in `docs/specs/event-registry.md` as one of:
      **Live** (has a subscriber), **Planned** (links a REQ id), or **Removed**.
- [ ] Events classified **Removed** are deleted along with their publication sites.
- [ ] Events classified **Planned** carry a linked requirement id; an event with neither a
      subscriber nor a requirement is not permitted.
- [ ] A test asserts every event name declared in `src` appears in the registry, so a new event
      cannot be added without classification.
- [ ] The registry records the counts at the time of writing (89 declared / 23 subscribed).

### L2 — Navigation reachability
- [ ] `/support` appears in the authenticated sidebar (coordinated with `REQ-0072`).
- [ ] `/analytics/journeys` is reachable from the analytics navigation.
- [ ] No two nav entries share a destination; "Campaigns" points at the campaigns surface, not
      `/stores`.
- [ ] Active-state highlighting matches exactly one entry per route.
- [ ] A test enumerates every `page.tsx` route and asserts each is either present in the nav or on
      an explicit allow-list of deliberately unlinked routes (detail pages, callbacks).

### L3 — Admin nav injection
- [ ] The admin section is located by a stable identifier (label or key), not `sections[5]`.
- [ ] The non-null assertion is removed; a missing section is handled explicitly.
- [ ] Reordering the sections array does not change behaviour — covered by a test.

### L4 — Debug logging
- [ ] A `LOG_LEVEL` env var (`debug` | `info` | `warn` | `error`, default `info`) gates emission.
- [ ] `logger.debug` is a no-op unless `LOG_LEVEL=debug`.
- [ ] `LOG_LEVEL` is documented in `.env.example` and `docs/deployment.md`.
- [ ] A test asserts `logger.debug` emits nothing at the default level.

### L5 — Fly.io machine configuration
- [x] `min_machines_running = 1` for the `app` process (also required by `REQ-0067` H6). *(PARTIAL — `auto_stop_machines` still `"stop"` in `fly.toml`.)*
- [ ] The webhook cold-start path is measured and recorded; if the p95 ack exceeds Meta's
      tolerance, the machine size is increased.
- [ ] The 512 MB shared-CPU VM sizing decision is re-evaluated against measured SSR + AI
      orchestration memory use, and the outcome recorded in `docs/decisions/`.
- [ ] `docs/deployment.md` explains why scale-to-zero is unsafe for this workload.

### L7 — Escalation marker
- [ ] Detection uses `/\[ESCALATE\]/i.test(rawReply)` so it matches the case-insensitive strip.
- [ ] A unit test covers `[ESCALATE]`, `[escalate]`, and `[Escalate]`.
- [ ] Every other marker parsed out of AI output is inventoried and made consistent; the inventory
      is recorded in the task file.

## 7. Scope & Dependencies

**Modules affected:** `ai`, `shared/events`, `shared/observability`, `src/components/app-shell.tsx`,
`fly.toml`, docs.

**Depends on:** `REQ-0067` H6/H7 (the event census informs which events survive the abandoned-cart
decision); `REQ-0072` (sidebar entry for `/support`).

## 8. Open Questions

1. For each of the ~66 unsubscribed events: keep as Planned or delete? This is a per-event product
   call made during the census. **Default: keep events that map to an existing REQ; delete the
   rest.**
2. Should `LOG_LEVEL=debug` be permitted in production at all? **Default: yes, but log a warning at
   startup so it cannot be left on accidentally.**

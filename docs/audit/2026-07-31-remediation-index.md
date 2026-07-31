# Production Readiness Remediation Index — 2026-07-31

> **Purpose:** a complete, one-to-one mapping from every item in
> `PRODUCTION_READINESS_AUDIT.md` to the requirement, task, and tracker that owns it. If an audit
> item is not in this table, it is not being worked on — and that is a bug in this document.
>
> **Source report:** `PRODUCTION_READINESS_AUDIT.md` (report version 2026-07-29, addendum
> 2026-07-31; commits audited `06395c4` / `f64cf84`).
> **Re-verification commit:** `33e2e0b` (branch `claude/production-readiness-requirements-vryjzt`).
> **Verdict at re-verification:** 🔴 NO-GO — all 33 findings remain open.

---

## 1. Workstreams

| REQ | Title | Owns | Blocking release? |
|---|---|---|---|
| [REQ-0067](../requirements/REQ-0067-release-blockers-critical-high.md) | Release blockers | C1, C2, H1–H10 | **Yes** |
| [REQ-0068](../requirements/REQ-0068-medium-severity-hardening.md) | Medium-severity hardening | M1, M2, M4–M15 | No (M5 blocks Shopify listing) |
| [REQ-0069](../requirements/REQ-0069-low-severity-and-event-census.md) | Low findings + event census | L1–L5, L7 | No |
| [REQ-0070](../requirements/REQ-0070-identity-account-self-service.md) | Identity & account self-service | §8.1–8.3, L6, Q6 | No (recommended) |
| [REQ-0071](../requirements/REQ-0071-billing-monetization-completeness.md) | Billing completeness | §8.5, §3.4 billing rows | No |
| [REQ-0072](../requirements/REQ-0072-platform-admin-support-discoverability.md) | Admin, support, discoverability | §8.6, §8.7, §3.4 health, §3.5 #7 | No |
| [REQ-0073](../requirements/REQ-0073-projects-workspace-lifecycle.md) | Projects & workspace lifecycle | Q1, Q2, M3, §3.5 #1, §8.4 | No (decision gate) |
| [REQ-0074](../requirements/REQ-0074-test-coverage-quality-gates.md) | Test coverage & CI gates | H8, CI Redis gap | **Yes** (for C1–H10 paths) |
| [REQ-0075](../requirements/REQ-0075-release-engineering-dr-observability.md) | Release engineering, DR, observability | M12, §1.6 conditions 3–4, §6.1 | **Yes** (conditions 3–4) |

---

## 2. Critical and High findings (§4)

| ID | Finding | Severity | Owner | Item |
|---|---|---|---|---|
| C1 | NextAuth `trustHost` unset — auth 500s on Fly.io/Docker | 🔴 Critical | REQ-0067 | §7 C1 / TASK Step 1 |
| C2 | `RedisEventBus` dispatches every event twice | 🔴 Critical | REQ-0067 | §7 C2 / TASK Steps 5–6 |
| H1 | Unguarded `ensureSuperAdmin` prevents startup | 🟠 High | REQ-0067 | §7 H1 / TASK Step 3 |
| H2 | Stripe webhook has no idempotency | 🟠 High | REQ-0067 | §7 H2 / TASK Step 7 |
| H3 | `past_due` is a terminal state | 🟠 High | REQ-0067 | §7 H3 / TASK Step 8 |
| H4 | `/api/export/[id]` bypasses session revocation | 🟠 High | REQ-0067 | §7 H4 / TASK Step 4 |
| H5 | `archiveProject` hard-deletes and cascades | 🟠 High | REQ-0067 (+REQ-0073) | §7 H5 / TASK Step 9 |
| H6 | Event delivery has no durability, retry, or DLQ | 🟠 High | REQ-0067 | §7 H6 / TASK Step 6 |
| H7 | Abandoned-cart fires on every edit, no subscriber | 🟠 High | REQ-0067 | §7 H7 / TASK Step 10 |
| H8 | Test coverage far below threshold | 🟠 High | REQ-0074 | Tiers 1–3 |
| H9 | Shopify webhooks blocked by NextAuth middleware | 🟠 High | REQ-0067 | §7 H9 / TASK Step 2 |
| H10 | Seat limit exceeded by concurrent invites | 🟠 High | REQ-0067 | §7 H10 / TASK Step 11 |

---

## 3. Medium findings (§4)

| ID | Finding | Owner | Item |
|---|---|---|---|
| M1 | `/api/ready` unauthenticated, leaks internals | REQ-0068 | §6 M1 / TASK Step 1 |
| M2 | OTel falls back to `ConsoleSpanExporter` in production | REQ-0068 | §6 M2 / TASK Step 2 |
| M3 | Projects: no UI, check-then-insert name race | REQ-0073 (UI) + REQ-0067 H5 (race) | REQ-0073 §5/§6; TASK-0067 Step 9 |
| M4 | Inbox loads every message for every conversation | REQ-0068 | §6 M4 / TASK Step 3 |
| M5 | Shopify GDPR webhooks + `app/uninstalled` unhandled | REQ-0068 | §6 M5 / TASK Step 4 |
| M6 | Stripe API version unpinned | REQ-0068 | §6 M6 / TASK Step 5 |
| M7 | `notFound()` / `redirect()` return HTTP 200 | REQ-0068 | §6 M7 / TASK Step 6 |
| M8 | Accessibility: skip link, collapsed nav names, drawer focus | REQ-0068 | §6 M8 / TASK Step 7 |
| M9 | Bare SHA-256 key derivation, no rotation path | REQ-0068 | §6 M9 / TASK Step 8 |
| M10 | Login throttle per `email+IP` only, no feedback | REQ-0068 | §6 M10 / TASK Step 9 |
| M11 | Admin authorization rests on the layout guard | REQ-0068 | §6 M11 / TASK Step 10 |
| M12 | No CD, no rollback, no backups | REQ-0075 | §6.1–6.4 / TASK Packages A–D |
| M13 | `/help` auth-only (product decision) | REQ-0068 | §6 M13 / TASK Step 11 |
| M14 | `/support` still in `publicPaths` | REQ-0068 | §6 M14 / TASK Step 11 |
| M15 | AI prompt-injection and moderation incomplete | REQ-0068 | §6 M15 / TASK Step 12 |

---

## 4. Low findings (§4)

| ID | Finding | Owner | Item |
|---|---|---|---|
| L1 | 66 of 89 domain events have no subscriber | REQ-0069 | §6 L1 / TASK Step 1 |
| L2 | `/support` and `/analytics/journeys` unreachable; duplicate nav destinations | REQ-0069 | §6 L2 / TASK Step 2 |
| L3 | Admin nav injected via array index with `!` | REQ-0069 | §6 L3 / TASK Step 2 |
| L4 | `logger.debug` never gated | REQ-0069 | §6 L4 / TASK Step 3 |
| L5 | Scale-to-zero conflicts with webhook delivery | REQ-0069 | §6 L5 / TASK Step 4 |
| L6 | No bot protection on registration | REQ-0070 | §6.1 (bot protection) / TASK Package B |
| L7 | AI escalation marker is case-sensitive | REQ-0069 | §6 L7 / TASK Step 5 |

---

## 5. Product completeness gaps (§3.4, §3.5)

| # | Gap | Owner | Item |
|---|---|---|---|
| 3.5-1 | Projects UI | REQ-0073 | Decision gate + Path A/B |
| 3.5-2 | Shopify GDPR webhooks | REQ-0068 | M5 |
| 3.5-3 | `app/uninstalled` handling | REQ-0068 | M5 |
| 3.5-4 | Usage / quota visibility | REQ-0071 | §7.4 |
| 3.5-5 | Billing history | REQ-0071 | §7.2 |
| 3.5-6 | Abandoned-cart recovery | REQ-0067 | H7 |
| 3.5-7 | Global search | REQ-0072 | §6.5 |
| 3.5-8 | Backup/restore runbook | REQ-0075 | §6.4 |
| 3.4-a | Usage / quota dashboard | REQ-0071 | §7.4 |
| 3.4-b | Billing history / invoices | REQ-0071 | §7.2, §7.3 |
| 3.4-c | Webhook / integration health surface | REQ-0072 | §6.3 |
| 3.4-d | Team / seat management view | REQ-0071 | §7.6 |
| 3.2 | `Project` hard delete mislabelled "archive" | REQ-0067 | H5 |
| 3.3 | Login failure has no lockout feedback | REQ-0068 | M10 |

---

## 6. Product decisions (§3.6)

| # | Question | Owner | Default recorded |
|---|---|---|---|
| Q1 | Projects: ship the UI or delete the feature? | REQ-0073 | **Remove** (blocking decision gate) |
| Q2 | Should `STAFF` get a store-scoped landing page? | REQ-0073 | Yes — redirect to their store |
| Q3 | `past_due` policy — downgrade when? | REQ-0067 §5, REQ-0071 §5 | Retain plan; downgrade only on subscription deletion |
| Q4 | Event delivery: once per cluster or per instance? | REQ-0067 §5 | Once per cluster for side effects |
| Q5 | Shopify App Store listing intended? | REQ-0068 §8 | Assume yes → M5 is mandatory |
| Q6 | Free-plan abuse — CAPTCHA / domain restriction? | REQ-0070 §6.1 | Turnstile on registration |

---

## 7. Founder focus areas (§8)

| § | Area | Gaps | Owner |
|---|---|---|---|
| 8.1 | Super-admin login/logout/verification | No mobile MFA; seed does not reconcile; no session management UI | REQ-0070 §6.4–6.6 |
| 8.2 | Account creation form | No confirm password, no email verification, no DOB, no mobile, no phone verification | REQ-0070 §6.1–6.4 |
| 8.3 | Account settings | No email change, no password change, four dead links | REQ-0070 §6.2, §6.3, §6.7 |
| 8.4 | Workspace / project creation | Orphaned backend, hard-delete archive, no multi-workspace, onboarding creates no project | REQ-0073 |
| 8.5 | Payment flow | No downgrade/cancel, no invoice history, no `past_due` recovery or UX, no webhook idempotency | REQ-0071 (+REQ-0067 H2/H3) |
| 8.6 | Super-admin dashboard | No suspend/delete user, no org status management, no forced password reset | REQ-0072 §6.1, §6.2 |
| 8.7 | Help and support tickets | `/support` not in the sidebar; `publicPaths`/auth mismatch | REQ-0072 §6.4 (+REQ-0068 M14, REQ-0069 L2) |

---

## 8. Residual risks (§6.1)

| Risk | Owner | Item |
|---|---|---|
| Third-party API behaviour untested | REQ-0075 | G5 |
| Load and concurrency profile unknown | REQ-0075 | G1 |
| Accessibility conformance unproven | REQ-0075 (+REQ-0068 M8) | G2 |
| Prompt injection via customer DMs | REQ-0068 | M15 |
| Restore never exercised | REQ-0075 | D4 |
| Cross-tenant **write** isolation unverified | REQ-0074 | Tier 2 S2 |
| Multi-replica correctness unverified | REQ-0075 | G3 |

---

## 9. Release conditions (§1.6)

| # | Condition | Owner | Status |
|---|---|---|---|
| 1 | C1, C2, H1–H5, H6, H9, H10 fixed, each with a regression test | REQ-0067 + REQ-0074 | Open |
| 2 | Staging journey with exactly one of each side effect | REQ-0075 | Open (E4) |
| 3 | Rollback procedure documented **and rehearsed** | REQ-0075 | Open (C3) |
| 4 | Alerting on webhook failure rate, handler error rate, `/api/ready` | REQ-0075 | Open (F1) |

---

## 10. Corrections to the audit report

Recorded because acting on the report as written would leave defects in place.

| # | Audit statement | Verified reality at `33e2e0b` | Consequence |
|---|---|---|---|
| 1 | H9 status: "Fixed — Awaiting Verification"; `publicPaths` includes `/api/shopify/webhooks` at `f64cf84` | `publicPaths` in `src/modules/auth/infrastructure/auth.ts:215-231` does **not** include it | H9 is **open and release-blocking**, not awaiting verification. Owned by REQ-0067. |
| 2 | M11: "`admin/users/page.tsx` … the only self-guarding page (2 guards)" | **Zero** `requireSuperAdmin()` calls in any of the six admin pages | The finding is worse than reported; all six pages need the guard. Owned by REQ-0068. |
| 3 | L1 / H7: "88 declared events" | **89** declared, 23 subscribed | Use live `grep` counts, not the report's numbers. Owned by REQ-0069. |
| 4 | §6.2 lists "Webhook route reachability ❌ Fail" while §4 H9 says fixed | The §6.2 row is correct; the §4 addendum is not | Resolved in favour of §6.2. |

---

## 11. Suggested execution order

1. **REQ-0074 Package A** — CI Redis + audit + secret scanning + deeper smoke test *(unblocks everything; ~1 hour)*
2. **REQ-0073 Q1 decision** — ship or remove Projects *(prevents wasted H5 migration work)*
3. **REQ-0067** — all release blockers, each with its regression test
4. **REQ-0074 Tiers 1–2** — verify the blockers stay fixed
5. **REQ-0068** — medium hardening (M5 first if a Shopify listing is planned)
6. **REQ-0075** — CD, backups, rollback rehearsal, staging, alerting *(release conditions 3–4)*
7. **REQ-0070** → **REQ-0071** → **REQ-0072** — product completeness
8. **REQ-0069** — low findings and the event census
9. **REQ-0075 Package G** — residual-risk closure before declaring GO

---

## 12. Coverage assertion

Every numbered finding, gap, decision, residual risk, and release condition in
`PRODUCTION_READINESS_AUDIT.md` appears exactly once as an owned item above:

- §3.2, §3.3, §3.4, §3.5 gaps — §5 of this index
- §3.6 Q1–Q6 — §6
- §4 C1–C2, H1–H10, M1–M15, L1–L7 — §2, §3, §4
- §6.1 residual risks — §8
- §6.2 checklist failures — covered by the finding that produced each row
- §1.6 release conditions — §9
- §5 Phase 4 long-term architecture — REQ-0075 Package H
- §8.1–8.7 focus areas — §7

**Nothing in the audit is unowned.**

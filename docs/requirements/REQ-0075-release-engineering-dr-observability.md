# REQ-0075: Release Engineering, Disaster Recovery, Observability and Residual-Risk Closure

- **Status:** Approved
- **Owner:** DevOps / SRE
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0075-release-engineering-dr-observability.md`
- **Related Tracker:** `docs/trackers/TRACKER-0075-release-engineering-dr-observability.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §4 M12, §1.6 (release conditions 3 and 4), §6.1 (residual risks), §6.2 (final checklist rows), §5 Phase 4
- **Remediation index:** `docs/audit/2026-07-31-remediation-index.md`
- **Last updated:** 2026-07-31

> **ℹ️ Platform V2 note** — this hardening/quality-gate requirement is **retained and still active**. It is orthogonal to the V2 architecture rewrite (REQ-0076–REQ-0090). Findings referencing `Organization`/`Store`/`Project` models must be re-verified against the V2 schema once `REQ-0090-cleanup-migration.md` lands; everything else (security, testing, release engineering) applies unchanged.

## 1. Summary

There is no continuous deployment, no rollback procedure, no configured database backup, no
rehearsed restore, and no staging environment. `deploy.sh` is run manually from a developer machine.
The `Dockerfile` runner stage does not copy `prisma/`, so `prisma migrate deploy` **cannot** be run
from inside the production image — Fly.io works around this because `release_command` runs in a
build-context machine, but the Docker path documented in `README.md` has no migration story at all.
There is no alerting on webhook failure rate, event-handler error rate, or readiness.

The audit's release conditions 3 and 4 ("a rollback procedure is documented and rehearsed once" and
"alerting exists on webhook failure rate, event-handler error rate, and `/api/ready`") are owned
entirely by this requirement. It also closes the residual risks the audit could not test: load
behaviour, machine-verified accessibility, penetration testing, restore, and multi-replica
correctness.

## 2. Verified current state (re-checked at commit `33e2e0b`, 2026-07-31)

| Capability | State | Evidence |
|---|---|---|
| CI quality gates | ✅ | `.github/workflows/ci.yml` — lint, typecheck, test, migrate, build, smoke |
| Automated deployment | ❌ | `deploy.sh` is manual; only one workflow exists |
| Migration on deploy (Fly.io) | ✅ | `fly.toml` `release_command = "npx prisma migrate deploy"` |
| Migration on deploy (Docker) | ❌ | Runner stage copies `public`, `.next/standalone`, `.next/static` only — **no `prisma/`** |
| Rollback procedure | ❌ | Undocumented; migrations have no `down` scripts |
| Database backups | ❌ | `docs/operations.md` documents a `pg_dump` command but nothing is configured or scheduled |
| Restore rehearsal | ❌ | Never performed |
| Staging environment | ❌ | Not referenced anywhere |
| Secret scanning in CI | ❌ | Absent (added by `REQ-0074`) |
| `npm audit` in CI | ❌ | Absent (added by `REQ-0074`) |
| Alerting | ❌ | Sentry is initialised; no alert rules on webhooks, handler errors, or readiness |
| Load / stress testing | ❌ | Never performed |
| Machine a11y audit | ❌ | Never performed |
| Penetration test | ❌ | Never performed |
| Multi-replica soak | ❌ | All audit runtime testing used a single instance |

## 3. Goals

- A deploy is a reviewed, automated, repeatable action — not a laptop command.
- Any release can be rolled back within a documented and rehearsed procedure.
- The database is backed up automatically and a restore has actually been performed.
- A staging environment exists that matches production closely enough to catch C1-class defects.
- Operators are alerted before customers notice.
- The residual risks the audit could not test are either closed or explicitly accepted in writing.

## 4. Non-Goals

- Multi-region deployment.
- Kubernetes or a platform migration away from Fly.io.
- A full SRE practice (SLOs, error budgets) — a first alerting layer is the target here.

## 5. User Stories

- As an **engineer**, merging to `main` deploys automatically after CI passes, with no manual step.
- As an **on-call engineer**, I can roll back to the previous release in minutes using a written
  procedure I have rehearsed.
- As a **founder**, a database failure means hours of lost data at worst, and I know that because
  someone has actually restored a backup.
- As an **on-call engineer**, I am paged when the webhook failure rate spikes, not when a merchant
  emails.
- As an **engineer**, I can test a risky change in staging before it reaches customers.

## 6. Acceptance Criteria

### 6.1 Continuous deployment
- [x] A deploy workflow runs on `main` **only after** CI passes.
- [ ] Deploys require an environment approval (GitHub Environments) or an equivalent gate.
  (Workflow references `environment: production`; repo protection rules must be enabled.)
- [ ] The workflow deploys via `flyctl` with the release token in repository secrets.
  (`FLY_API_TOKEN` secret is referenced but not yet stored.)
- [x] `deploy.sh` either becomes a thin local wrapper around the same steps or is deleted.
- [x] The deployed commit SHA is recorded and exposed at `/api/health` for verification.

### 6.2 Docker image and migrations
- [x] The runner stage copies `prisma/` so `npx prisma migrate deploy` works from inside the image.
- [x] `docs/deployment.md` documents the migration step for the plain-Docker path, not only Fly.io.
- [x] A container built from the `Dockerfile` is verified to run migrations successfully.
- [x] The image is scanned for vulnerabilities in CI.

### 6.3 Rollback
- [x] `docs/operations.md` contains a rollback runbook covering: previous image redeploy, the
      migration-compatibility policy, and what to do when a migration is not backward-compatible.
- [x] A migration policy is documented and enforced: every migration must be backward-compatible
      with the previous application version (expand/contract), so a rollback never requires a
      database restore.
- [ ] A rollback has been **rehearsed once** against staging and the result recorded with a date.

### 6.4 Backups and restore
- [x] Automated daily PostgreSQL backups are configured with retention documented (default 30
      days).
- [ ] Backups are stored off the primary host. (S3 workflow and scripts configured; first upload
      pending credentials.)
- [x] Backup success/failure is monitored and alerts on failure.
- [x] A **restore drill** has been performed into a scratch database, verifying row counts and
      application boot, with the date and RTO/RPO measured recorded in `docs/operations.md`.
- [x] The restore procedure is written such that someone who has not done it before can follow it.

### 6.5 Staging
- [ ] A staging environment exists with its own database, Redis, and third-party sandbox
      credentials. (`fly.staging.toml` exists; provisioning pending `FLY_API_TOKEN`.)
- [x] Staging runs the same image as production.
- [x] Staging is deployed automatically from `main` before the production gate.
- [ ] The audit's §1.6 condition 2 journey is executed in staging: register → verify → connect
      store → receive webhook → AI reply → checkout → plan change, with **exactly one** of each side
      effect.

### 6.6 Alerting and observability
- [x] Alerts exist on: webhook failure rate per provider, event-handler error rate, BullMQ
      failed-queue depth, `/api/ready` failing, error-rate spikes, and backup failure.
- [x] Each alert has a documented owner and a first response step.
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` is configured in production (depends on `REQ-0068` M2).
- [x] Sentry release tracking maps errors to the deployed commit.
- [ ] A dashboard shows request rate, error rate, latency, queue depth, and webhook health.
- [x] Alert thresholds are recorded and reviewed after the first month.

### 6.7 Residual-risk closure
- [ ] **Load test:** k6 or Artillery at 10× expected peak against staging; results recorded;
      bottlenecks either fixed or accepted in writing.
- [ ] **Accessibility:** axe-core and Lighthouse run against the main authenticated surfaces;
      findings triaged; colour contrast verified (complements `REQ-0068` M8).
- [ ] **Multi-replica soak:** two app replicas against one Redis and one database for at least
      24 hours, asserting exactly-once side effects (validates `REQ-0067` C2/H6 at scale).
- [ ] **Penetration test:** scheduled with a third party, or an explicit written acceptance of the
      risk with a review date.
- [ ] **Third-party integration verification:** the full journey run against Meta, Shopify, Stripe,
      and OpenAI sandbox credentials.
- [x] Every residual risk in audit §6.1 is either closed with evidence or recorded as accepted with
      an owner and a review date.

### 6.8 Long-term architecture (record, do not necessarily build)
- [x] Worker extraction (AI generation and webhook processing off the SSR process) is designed and
      recorded as an ADR; `fly.toml` already declares a `worker` process.
- [x] The transactional outbox pattern is recorded as an ADR as the permanent fix for the C2/H6
      defect class.
- [x] A second LLM provider (fallback for outage or price change) is recorded as an ADR.
- [x] Per-tenant AI cost attribution and quotas are recorded as an ADR.
- [x] Read replicas / caching for analytics surfaces are recorded as an ADR.

## 7. Scope & Dependencies

**Files:** `.github/workflows/` (new deploy workflow), `Dockerfile`, `fly.toml`, `deploy.sh`,
`docs/operations.md`, `docs/deployment.md`, `docs/decisions/`.

**Depends on:**
- `REQ-0074` Package A — CI must be trustworthy before it gates deploys.
- `REQ-0067` — do not automate deployment of a build with known Critical defects.
- `REQ-0068` M2 — the OTLP endpoint must exist for tracing to be useful.

## 8. Open Questions

1. Managed Postgres backups (Fly.io/Neon built-in) or a self-managed `pg_dump` job? **Default: use
   the platform's managed backups plus one independent weekly `pg_dump` to separate storage, so a
   platform account issue is not a total loss.**
2. Where do alerts go — Sentry, PagerDuty, or email? **Default: Sentry alerts plus email while the
   team is small; revisit at the first on-call rotation.**
3. Is a paid penetration test in budget before launch? If not, the risk acceptance must be signed
   with a review date. **Default: accept with a 6-month review.**
4. Should staging use production-like data volume? **Default: synthetic data at production scale
   for load testing; never a copy of production customer data.**

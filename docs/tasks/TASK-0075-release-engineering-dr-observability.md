# TASK-0075: Implement Release Engineering, DR, Observability and Residual-Risk Closure

- **Status:** In Progress
- **Last updated:** 2026-08-01
- **Owner:** DevOps / SRE
- **Requirement:** `docs/requirements/REQ-0075-release-engineering-dr-observability.md`
- **Tracker:** `docs/trackers/TRACKER-0075-release-engineering-dr-observability.md`
- **Module(s):** CI/CD, infrastructure, operations documentation
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Added CD workflow, staging, rollback runbook, automated backups with a rehearsed restore, alerting, and closed the audit's residual risks.
- **Last updated:** 2026-07-31

## 1. Summary

Seven packages. Package A (Docker/migration fix) and Package D (backups) are the highest value per
hour — the first makes the documented Docker path actually deployable, the second means a database
failure is survivable. Package G (residual-risk closure) is verification work, mostly run once.

## 2. References

- Audit: `PRODUCTION_READINESS_AUDIT.md` §4 M12, §1.6, §6.1, §6.2, §5 Phase 4
- Requirement: `docs/requirements/REQ-0075-release-engineering-dr-observability.md`
- Existing: `Dockerfile`, `fly.toml`, `deploy.sh`, `docs/operations.md`, `docs/deployment.md`

## 3. Implementation Plan

---

### Package A — Docker image can run migrations

**File:** `Dockerfile`

The runner stage currently copies only `public`, `.next/standalone`, and `.next/static`. Without
`prisma/`, `npx prisma migrate deploy` cannot run inside the image, so the Docker path documented in
`README.md` has no migration story.

```dockerfile
# 3. Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrations must be runnable from inside the image; the standalone bundle omits them.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

Verify by building and running `npx prisma migrate deploy` inside the container against a scratch
database. Measure the image size delta and record it — if the Prisma CLI is too heavy, an
alternative is a separate migration image built from the same source; record whichever is chosen.

Document the Docker migration step in `docs/deployment.md`.

---

### Package B — Continuous deployment

**File:** `.github/workflows/deploy.yml` (new)

```yaml
name: Deploy

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

jobs:
  staging:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --config fly.staging.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  production:
    needs: staging
    runs-on: ubuntu-latest
    environment: production   # requires manual approval via GitHub Environments
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Expose the deployed commit at `/api/health` so a deploy can be verified without guessing:

```typescript
// src/app/api/health/route.ts — keep it dependency-free (H1)
return NextResponse.json({
  status: "ok",
  version: process.env.GIT_COMMIT_SHA ?? "unknown",
});
```

Pass `GIT_COMMIT_SHA` as a Docker build arg. Then either delete `deploy.sh` or reduce it to a thin
wrapper that calls the same `flyctl` command, so there is one deployment path, not two.

---

### Package C — Rollback runbook and migration policy

**File:** `docs/operations.md`

Write the runbook so it is followable under pressure by someone who has not done it:

```markdown
## Rollback

1. Identify the last known-good release:
   `flyctl releases --app omniconnect-ai`
2. Roll back the application:
   `flyctl deploy --image registry.fly.io/omniconnect-ai:<previous-tag>`
3. Verify: `curl https://<host>/api/health` returns the expected commit SHA;
   `/api/ready` returns 200.
4. Migrations are **not** rolled back. Every migration must be backward-compatible with
   the previous application version (see the policy below), so the old code runs against
   the new schema.
5. If a migration is not backward-compatible, a rollback requires a restore — follow
   "Restore from backup" and expect data loss back to the last backup.

## Migration compatibility policy (expand / contract)

- **Expand first:** add columns as nullable, add tables, add indexes concurrently.
  Deploy the code that writes to both old and new shapes.
- **Contract later:** only after the new code is stable in production, drop the old
  column or constraint in a subsequent release.
- **Never** in a single release: rename a column, drop a column still read by the
  previous version, or add a NOT NULL column without a default.
```

Rehearse the rollback once against staging and record the date and outcome in the runbook.

---

### Package D — Backups and a real restore drill

**Files:** `docs/operations.md`, backup job configuration

1. Enable the platform's managed daily backups; document the retention (default 30 days).
2. Add an independent weekly `pg_dump` to separate object storage, so a platform account problem is
   not a total loss:

```bash
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -Fc \
  | aws s3 cp - "s3://$BACKUP_BUCKET/omniconnect-$(date +%Y%m%d).dump"
```

3. Alert on backup job failure — a backup nobody watches is not a backup.
4. **Restore drill** (this is the acceptance criterion, not the script):

```markdown
## Restore drill — performed <DATE> by <NAME>

1. Provision a scratch database.
2. `pg_restore -d "$SCRATCH_URL" --clean --if-exists omniconnect-<date>.dump`
3. Verify row counts against the source for: User, Organization, Store, Product,
   Order, Conversation, Message.
4. Point a local application build at the scratch database; sign in; load the dashboard.
5. Record: total restore time (RTO) and the age of the newest data (RPO).

Result: RTO = __ minutes. RPO = __ hours. Issues found: __
```

---

### Package E — Staging environment

**Files:** `fly.staging.toml` (new), `docs/deployment.md`

Same image, separate app, separate database and Redis, sandbox credentials for Meta, Shopify,
Stripe (test mode), and OpenAI. `min_machines_running = 1` so webhooks land.

Run the audit's §1.6 condition 2 journey against staging and record the result: register → verify →
connect store → receive webhook → AI reply → checkout → plan change, asserting **exactly one** of
each side effect (one AI reply, one coupon, one plan update).

**Never** copy production customer data into staging. Use the seed/synthetic data path.

---

### Package F — Alerting and dashboards

**Files:** Sentry configuration, `docs/operations.md`

| Alert | Condition | First response |
|---|---|---|
| Webhook failure rate | >5% over 15 min, per provider | Check provider status; inspect `SystemLog` |
| Event-handler errors | >10 in 15 min | Check the failed queue; inspect handler logs |
| Failed-queue depth | >50 | Inspect and drain; look for a poison message |
| Readiness failing | `/api/ready` non-200 for 3 consecutive checks | Check the database and Redis |
| Error-rate spike | 5× the 7-day baseline | Sentry issue triage |
| Backup failure | Any failed backup job | Re-run; escalate if it repeats |

Each alert needs a named owner in the runbook. Configure Sentry release tracking so errors map to a
deployed commit. Build one dashboard covering request rate, error rate, p95 latency, queue depth,
and webhook health per provider.

Review thresholds after the first month — an alert that fires constantly gets ignored, which is
worse than no alert.

---

### Package G — Residual-risk closure

Each item produces a written artefact; "we think it's fine" is not closure.

**G1 — Load test.** k6 against staging at 10× expected peak. Scenario: authenticated dashboard
loads, inbox reads, webhook ingestion, AI generation. Record p50/p95/p99 latency, error rate, and
the saturation point. File findings as new requirements or accept them in writing.

**G2 — Accessibility.** axe-core (CI-runnable via `@axe-core/cli` against a booted server) plus a
Lighthouse pass on the main authenticated surfaces. Triage findings; verify colour contrast, which
`REQ-0068` M8 explicitly did not cover.

**G3 — Multi-replica soak.** Two app replicas, one Redis, one database, 24 hours of synthetic
traffic. Assert exactly-once side effects — this is what validates the `REQ-0067` C2/H6 fixes at
the scale where they matter.

**G4 — Penetration test.** Schedule with a third party, or write an explicit risk acceptance signed
by the founder with a review date.

**G5 — Third-party integration verification.** Run the full journey against real sandbox
credentials for Meta, Shopify, Stripe, and OpenAI — the audit could test none of these.

**G6 — Risk register.** Add `docs/operations.md` §Risk register listing every §6.1 residual risk as
Closed (with evidence) or Accepted (with an owner and review date).

---

### Package H — Architecture ADRs

Record, do not necessarily build:

- `ADR-XXXX-worker-extraction.md` — move AI generation and webhook processing off the SSR process.
- `ADR-XXXX-transactional-outbox.md` — the permanent fix for the C2/H6 defect class.
- `ADR-XXXX-second-llm-provider.md` — fallback for outage or price change.
- `ADR-XXXX-per-tenant-ai-quotas.md` — cost attribution beyond the reply counter.
- `ADR-XXXX-analytics-read-replicas.md` — read replicas / caching before scale demands it.

---

## 4. Subtasks

- [x] **A.1** Copy `prisma/` and the Prisma runtime into the Docker runner stage.
- [x] **A.2** Verify `prisma migrate deploy` runs inside a built container.
- [x] **A.3** Record the image size delta; choose single-image vs separate migration image.
- [x] **A.4** Document the Docker migration step in `docs/deployment.md`.
- [x] **A.5** Add container vulnerability scanning to CI.
- [x] **B.1** Add the deploy workflow gated on CI success.
- [ ] **B.2** Configure GitHub Environments with production approval.
- [ ] **B.3** Store the Fly release token as a repository secret.
- [x] **B.4** Expose `GIT_COMMIT_SHA` at `/api/health` without adding dependencies.
- [x] **B.5** Reduce or delete `deploy.sh` so there is one deployment path.
- [x] **C.1** Write the rollback runbook.
- [x] **C.2** Write and adopt the expand/contract migration policy.
- [ ] **C.3** Rehearse a rollback against staging; record the date and outcome.
- [x] **D.1** Enable managed daily backups; document retention.
- [x] **D.2** Add the independent weekly `pg_dump` to off-platform storage.
- [x] **D.3** Alert on backup failure.
- [ ] **D.4** Perform the restore drill; record RTO and RPO.
- [x] **D.5** Write the restore procedure for someone who has never done it.
- [x] **E.1** Create `fly.staging.toml` and the staging app.
- [ ] **E.2** Provision staging database, Redis, and sandbox credentials.
- [x] **E.3** Deploy staging automatically from `main`.
- [ ] **E.4** Run the §1.6 condition 2 journey in staging; assert exactly-once side effects.
- [x] **E.5** Document that production data is never copied to staging.
- [x] **F.1** Configure all six alerts with owners and first-response steps.
- [x] **F.2** Configure Sentry release tracking.
- [ ] **F.3** Build the operations dashboard.
- [x] **F.4** Schedule a threshold review one month after launch.
- [ ] **G.1** Run the load test; record results; file or accept findings.
- [ ] **G.2** Run axe-core and Lighthouse; triage findings; verify contrast.
- [ ] **G.3** Run the 24-hour two-replica soak; assert exactly-once side effects.
- [ ] **G.4** Schedule a penetration test or record a signed risk acceptance.
- [ ] **G.5** Verify all four third-party integrations against sandbox credentials.
- [x] **G.6** Write the risk register with Closed/Accepted status for every §6.1 risk.
- [x] **H.1** Write the worker-extraction ADR.
- [x] **H.2** Write the transactional-outbox ADR.
- [x] **H.3** Write the second-LLM-provider ADR.
- [x] **H.4** Write the per-tenant AI quota ADR.
- [x] **H.5** Write the analytics read-replica ADR.

## 5. Acceptance Criteria

- [ ] All `REQ-0075` acceptance criteria are met.
- [ ] The audit's §1.6 release conditions 3 (rollback documented **and rehearsed**) and 4
      (alerting on webhook failure rate, handler error rate, and `/api/ready`) are satisfied.
- [ ] A restore has actually been performed, not merely documented.
- [ ] Every §6.1 residual risk is Closed with evidence or Accepted with an owner and review date.
- [ ] `CHANGELOG.md` updated last.

## 6. Notes / Blockers

- **Do not automate deployment** of a build with known Critical defects — `REQ-0067` first.
- **Depends on** `REQ-0074` Package A: CI must be trustworthy before it gates deploys.
- **Depends on** `REQ-0068` M2 for a useful OTLP endpoint.
- **Record here during implementation:**
  - **A.3 decision:** Single image. `omniconnect-ai:local` grew from 362 MB to 374 MB after adding `prisma/`, `scripts/`, the Prisma runtime, and the `prisma`/`tsx` CLI symlinks. `npx prisma migrate deploy` verified inside the container.
  - Measured RTO and RPO from the restore drill (D.4).
  - Load-test saturation point (G.1).
  - Soak-test result and any exactly-once violations found (G.3).
  - Penetration-test date or the risk-acceptance signature and review date (G.4).

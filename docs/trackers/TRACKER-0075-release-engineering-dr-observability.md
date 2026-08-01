# TRACKER-0075: Release Engineering, DR, Observability and Residual-Risk Closure

- **Status:** In Progress
- **Last updated:** 2026-08-01
- **Owner:** DevOps / SRE
- **Requirement:** `docs/requirements/REQ-0075-release-engineering-dr-observability.md`
- **Task:** `docs/tasks/TASK-0075-release-engineering-dr-observability.md`

## 1. Summary

Closes M12 (no CD, no rollback, no backups), the audit's §1.6 release conditions 3 and 4, and the
§6.1 residual risks the audit could not test (load, accessibility, penetration, restore,
multi-replica correctness, live third-party integrations).

## 2. Subtasks

### Planning
- [ ] Requirement reviewed and approved.
- [ ] Decided: managed vs self-managed backups.
- [ ] Decided: alert destination.
- [ ] Decided: penetration test in budget, or risk accepted.
- [ ] Branch created from `main`.

### Package A — Docker image and migrations
- [x] `prisma/` and the Prisma runtime copied into the runner stage.
- [x] `prisma migrate deploy` verified inside a built container.
- [x] Image size delta recorded; single-image vs separate-image decision made.
- [x] Docker migration step documented in `docs/deployment.md`.
- [x] Container vulnerability scanning added to CI.

### Package B — Continuous deployment
- [x] Deploy workflow added, gated on CI success.
- [ ] GitHub Environments configured with production approval.
- [ ] Fly release token stored as a secret.
- [x] `GIT_COMMIT_SHA` exposed at `/api/health` with no added dependencies.
- [x] `deploy.sh` reduced to a wrapper.

### Package C — Rollback
- [x] Rollback runbook written in `docs/operations.md`.
- [x] Expand/contract migration policy written and adopted.
- [ ] Rollback **rehearsed** against staging; date and outcome recorded.

### Package D — Backups and restore
- [ ] Managed daily backups enabled; retention documented.
- [ ] Independent weekly `pg_dump` to off-platform storage configured.
- [ ] Backup failure alerting configured.
- [ ] **Restore drill performed**; RTO and RPO recorded.
- [ ] Restore procedure written for a first-time operator.

### Package E — Staging
- [ ] `fly.staging.toml` created; staging app provisioned.
- [ ] Staging database, Redis, and sandbox credentials provisioned.
- [ ] Staging deploys automatically from `main`.
- [ ] §1.6 condition 2 journey executed in staging with exactly-once side effects verified.
- [ ] Documented that production data is never copied to staging.

### Package F — Alerting and dashboards
- [ ] Webhook failure-rate alert configured with an owner.
- [ ] Event-handler error-rate alert configured.
- [ ] Failed-queue depth alert configured.
- [ ] `/api/ready` failure alert configured.
- [ ] Error-rate spike alert configured.
- [ ] Backup failure alert configured.
- [ ] Sentry release tracking configured.
- [ ] Operations dashboard built.
- [ ] Threshold review scheduled for one month post-launch.

### Package G — Residual-risk closure
- [ ] **G1** Load test run at 10× peak; results recorded; findings filed or accepted.
- [ ] **G2** axe-core and Lighthouse run; findings triaged; contrast verified.
- [ ] **G3** 24-hour two-replica soak run; exactly-once side effects asserted.
- [ ] **G4** Penetration test scheduled, or risk accepted with an owner and review date.
- [ ] **G5** Meta, Shopify, Stripe, and OpenAI verified against sandbox credentials.
- [x] **G6** Risk register written; every §6.1 risk Closed or Accepted.

### Package H — Architecture ADRs
- [x] Worker-extraction ADR written.
- [x] Transactional-outbox ADR written.
- [x] Second-LLM-provider ADR written.
- [x] Per-tenant AI quota ADR written.
- [x] Analytics read-replica ADR written.

### Verification
- [ ] A deploy to staging completes end to end via the workflow.
- [ ] A production deploy completes with approval.
- [ ] A rollback completes within the documented procedure.
- [ ] A restore completes and the application boots against the restored database.
- [ ] All six alerts fire correctly when their conditions are simulated.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` updated with the deployment topology.

## 3. Acceptance Criteria

- [ ] All `REQ-0075` acceptance criteria are met.
- [ ] Audit §1.6 release conditions 3 and 4 are satisfied.
- [ ] A restore has actually been performed, not merely documented.
- [ ] Every §6.1 residual risk is Closed with evidence or Accepted with an owner and review date.

## 4. Notes / Blockers

- **Do not automate deployment** until `REQ-0067` lands — automating a broken build only ships it
  faster.
- Depends on `REQ-0074` Package A (trustworthy CI) and `REQ-0068` M2 (OTLP endpoint).
- The multi-replica soak (G3) is the real validation of the `REQ-0067` C2/H6 fixes; single-instance
  tests cannot prove them.

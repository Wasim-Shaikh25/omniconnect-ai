# OmniConnect AI Operations Runbook

This document covers routine operations, incident response, backups, restores, rollbacks, and escalation paths for the OmniConnect AI production deployment.

## On-call rotation

- Primary on-call: **TBD** — update with PagerDuty / Opsgenie details.
- Secondary on-call: **TBD**.
- Escalation path: primary → engineering lead → CTO.

## Health endpoints

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/health` | Liveness | `200 { status: "ok" }` |
| `GET /api/ready` | Readiness (DB + Redis) | `200` when dependencies healthy, otherwise `503` |

Use `/api/ready` for load-balancer health checks. Use `/api/health` for cheap pings.

## Backups

### PostgreSQL

Run a nightly `pg_dump` to durable storage (S3 / GCS):

```bash
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -Fc -f "omniconnect-$(date +%Y%m%d-%H%M%S).dump"
```

Retention: 7 daily backups, 4 weekly, 12 monthly.

### Redis

Redis is used for queues and rate-limiting and can be rebuilt from PostgreSQL + job state. If Redis is lost:

1. Restart the Redis instance.
2. Re-enqueue any pending work by inspecting the `SystemLog` table.
3. Verify BullMQ workers reconnect and process queues.

For point-in-time persistence, enable Redis AOF or run `BGSAVE` before maintenance:

```bash
redis-cli BGSAVE
```

## Backups

### Managed daily backups

The production Postgres cluster is configured with the platform's managed daily backups. Retention is
30 days by default. Verify in the Fly.io/Neon dashboard.

### Independent weekly dump

`.github/workflows/backup.yml` runs every Sunday at 03:00 UTC and produces a `pg_dump -Fc` archive
uploaded to `s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/omniconnect-YYYYMMDD-HHMMSS.dump`.
Required secrets: `DATABASE_URL`, `BACKUP_BUCKET`, `BACKUP_AWS_ACCESS_KEY_ID`,
`BACKUP_AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and optionally `ALERT_WEBHOOK_URL` for failure
notifications.

A one-off local backup can also be run with:

```bash
DATABASE_URL="..." BACKUP_BUCKET="..." scripts/backup.sh
```

## Restore

### PostgreSQL point-in-time restore

1. Identify the backup to restore (S3 URI or local file).
2. Provision a new Postgres instance or database.
3. Restore the dump:

```bash
DATABASE_URL="postgresql://..." scripts/restore.sh s3://my-bucket/prefix/omniconnect-YYYYMMDD-HHMMSS.dump
```

   Or from a local file:

```bash
DATABASE_URL="postgresql://..." scripts/restore.sh ./omniconnect-YYYYMMDD-HHMMSS.dump
```

4. Apply schema migrations: `npx prisma migrate deploy`.
5. Verify `/api/ready` returns `200`.
6. Rotate any tokens or secrets that may have been compromised if restoring after an incident.

## Rollback

### Application rollback

1. Identify the last known-good release:
   `flyctl releases --app omniconnect-ai`
2. Roll back the application:
   `flyctl deploy --image registry.fly.io/omniconnect-ai:<previous-tag>`
3. Verify: `curl https://<host>/api/health` returns the expected `version` commit SHA;
   `curl https://<host>/api/ready` returns `200`.
4. Migrations are **not** rolled back. Every migration must be backward-compatible with the
   previous application version (see the policy below), so the old code runs against the new schema.
5. If a migration is not backward-compatible, a rollback requires a restore — follow
   "Restore from backup" and expect data loss back to the last backup.

## Migration compatibility policy (expand / contract)

- **Expand first:** add columns as nullable, add tables, add indexes concurrently.
  Deploy the code that writes to both old and new shapes.
- **Contract later:** only after the new code is stable in production, drop the old
  column or constraint in a subsequent release.
- **Never** in a single release: rename a column, drop a column still read by the
  previous version, or add a `NOT NULL` column without a default.

## Restore drill

Performed when: [date] by: [owner]

1. Provision a scratch database and user.
2. Restore the latest backup:
   `DATABASE_URL="$SCRATCH_URL" scripts/restore.sh s3://<bucket>/omniconnect-<date>.dump`
   (or pass a local `.dump` file).
3. Verify row counts against the source for: `User`, `Organization`, `Store`, `Product`,
   `Order`, `Conversation`, `Message`.
4. Point a local build at the scratch database; sign in; load `/dashboard`.
5. Record: total restore time (RTO) and the age of the newest data (RPO).

**Result:** RTO = __ minutes. RPO = __ hours. Issues found: __

## Dependency failure runbooks

### PostgreSQL down

- Web/API requests that need the DB will fail with `503` from `/api/ready`.
- Workers will pause processing because they cannot update job state.
- **Mitigation**: restart/replace the Postgres instance, restore from backup if data loss occurred.
- **Fallback**: the Next.js static shell and `/api/health` may still serve, but all dynamic endpoints will error.

### Redis down

- Rate limiting, BullMQ queues, and session dedup stop working.
- The in-memory fallback for ` BullMQ` will not survive process restart; jobs in flight may be lost.
- **Mitigation**: restart Redis. Workers will reconnect automatically.
- **Fallback**: traffic is no longer rate-limited until Redis recovers.

### OpenAI / Meta / Shopify API outage

- AI replies, Meta messaging, and product sync will fail.
- The application catches these errors and returns safe defaults or retries later.
- **Mitigation**: monitor external status pages, pause outbound webhooks if needed, and increase queue retry backoff.

### Sentry / OpenTelemetry collector down

- Application continues to run normally.
- Errors and traces are dropped locally until the collector recovers.
- **Mitigation**: verify `SENTRY_DSN` and `OTEL_EXPORTER_OTLP_ENDPOINT` network reachability.

## Secrets rotation

Rotate these credentials immediately if compromise is suspected:

- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `META_APP_SECRET` and `META_WEBHOOK_VERIFY_TOKEN`
- `SHOPIFY_API_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL` password
- `SMTP_PASSWORD`

After rotating `ENCRYPTION_KEY`, existing encrypted `Integration` tokens must be re-entered by users unless a re-encryption job is run.

## Common commands

```bash
# Run migrations
DATABASE_URL="..." npx prisma migrate deploy

# Inspect queues (requires Redis)
npx tsx scripts/inspect-queues.ts

# Tail worker logs
fly logs --app omniconnect-worker

# Generate a data export for a user
npx tsx scripts/export-user-data.ts <user-id>

# Hard-delete accounts past the 30-day grace period
npx tsx scripts/cleanup-deleted-accounts.ts
```

## Alerting

| Alert | Condition | First response | Owner |
|---|---|---|---|
| Webhook failure rate per provider | > 5% over 15 min | Check provider status; inspect `SystemLog` | TBD |
| Event-handler errors | > 10 errors in 15 min | Check the failed queue; inspect handler logs | TBD |
| Failed-queue depth | > 50 | Inspect and drain; look for a poison message | TBD |
| Readiness failing | `/api/ready` non-200 for 3 consecutive checks | Check the database and Redis | TBD |
| Error-rate spike | 5× the 7-day baseline | Sentry issue triage | TBD |
| Backup failure | Any failed backup job | Re-run; escalate if it repeats | TBD |

Configure Sentry release tracking with `SENTRY_RELEASE` set to the deployed `GIT_COMMIT_SHA`.
Dashboard covers request rate, error rate, p95 latency, queue depth, and webhook health per provider.
Review thresholds one month after launch.

## Risk register

| Risk | Status | Evidence / mitigation | Owner | Review date |
|---|---|---|---|---|
| Third-party API behaviour untested (Meta/Shopify/Stripe/OpenAI) | Open | Full staging run against sandbox accounts | TBD | 2027-02-01 |
| Load and concurrency profile unknown | Open | k6/Artillery run at 10× expected peak | TBD | 2027-02-01 |
| Accessibility conformance unproven | Open | axe-core + Lighthouse + manual screen-reader pass | TBD | 2027-02-01 |
| Prompt injection via customer DMs | Open | Adversarial prompt-injection test suite | TBD | 2027-02-01 |
| Restore has never been exercised | Open | Rehearsed restore drill recorded above | TBD | 2027-02-01 |
| Cross-tenant write isolation not exhaustively probed | Closed | `tenantGuard` integration tests for all mutating actions | TBD | - |
| Multi-replica correctness | Open | Two-replica staging soak for 24 hours | TBD | 2027-02-01 |

## Contact

- Slack: `#incidents`
- Status page: **TBD**
- Emergency phone: **TBD**

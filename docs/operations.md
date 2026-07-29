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

## Restore

### PostgreSQL point-in-time restore

1. Provision a new Postgres instance or database.
2. Apply schema migrations: `npx prisma migrate deploy`.
3. Restore the dump:

```bash
pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists latest.dump
```

4. Verify `/api/ready` returns `200`.
5. Rotate any tokens or secrets that may have been compromised if restoring after an incident.

## Rollback

### Application rollback

1. Identify the last known good container image / release tag.
2. Redeploy the previous image:

```bash
fly deploy --image registry.example.com/omniconnect-ai:<previous-tag>
```

3. If a bad migration was deployed, do **not** run `migrate deploy` again. Instead restore the database to a pre-migration backup.
4. Verify `/api/health` and `/api/ready`.

### Database migration rollback

Prisma migrations are forward-only. To rollback:

1. Restore the database from a pre-migration backup.
2. Re-deploy the matching previous application version.
3. Only then create a corrective migration.

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

## Contact

- Slack: `#incidents`
- Status page: **TBD**
- Emergency phone: **TBD**

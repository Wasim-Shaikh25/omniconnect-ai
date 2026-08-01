# ADR 0006: Analytics Read Replicas / Caching

- **Status:** Proposed
- **Date:** 2026-08-01
- **Deciders:** wasim

## Context

Analytics surfaces (`/analytics/*`) run aggregate queries against the primary PostgreSQL database. At low volume this is fine, but as merchants accumulate products, orders, and conversations these queries will contend with write traffic and slow down the operational dashboards.

## Decision

Plan for read replicas / caching before scale forces a fire drill:

1. First, add Redis caching for hot aggregate reads with a short TTL (e.g. 5 minutes for dashboard cards, 1 hour for trend reports).
2. When query load justifies it, add a PostgreSQL read replica for analytics queries.
3. Use Prisma's read-replica support or a separate Prisma client pointing at the replica URL.
4. Keep writes and transactional reads on the primary.

No code is required for MVP; this ADR ensures the architecture can grow without a rewrite.

## Consequences

- Analytics load is isolated from OLTP.
- Adds cache invalidation complexity.
- Requires monitoring cache hit rate and replica lag.

## Alternatives Considered

- **Materialised views in primary DB:** rejected — still consumes primary CPU and storage.
- **Dedicated analytics warehouse (BigQuery/Snowflake):** rejected — overkill for current scale and team.

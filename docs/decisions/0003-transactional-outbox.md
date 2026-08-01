# ADR 0003: Adopt Transactional Outbox for Cross-Module Side Effects

- **Status:** Proposed
- **Date:** 2026-08-01
- **Deciders:** wasim

## Context

The `QueueEventBus` publishes domain events to BullMQ, but the publication is not atomic with the database transaction that produced the event. If the request commits and then Redis is unavailable, the event is lost. If Redis accepts the event and the DB transaction rolls back, subscribers observe phantom side effects. This is the root cause class behind `REQ-0067` C2/H6 (non-idempotent / duplicated events).

## Decision

Introduce a transactional outbox pattern as the permanent fix:

1. Each mutating use-case writes the intended event(s) to an `Outbox` table in the same transaction as the business state change.
2. A background relay (part of the worker process) polls the `Outbox` table, marks rows as `processed`, and publishes them to the event bus.
3. Subscribers remain unchanged; they consume from the bus.
4. The relay retries with backoff and skips rows already marked `processed`.

Until the outbox is implemented, `QueueEventBus` relies on `eventId`/`jobId` dedup, `removeOnFail: false`, and idempotent handlers as a stop-gap.

## Consequences

- Events are never lost once the DB transaction commits.
- No phantom events after a rollback.
- Adds one table and one polling interval to the worker.
- Requires all new events to be written through the outbox helper.

## Alternatives Considered

- **Change-feed / CDC (e.g. Debezium):** rejected — requires infrastructure beyond the current stack.
- **Saga / process manager:** rejected — over-engineered for the current event volume; outbox is sufficient.

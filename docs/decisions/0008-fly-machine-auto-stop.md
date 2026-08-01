# ADR 0008: Keep Fly.io machines running to avoid webhook cold starts

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Devin

## Context

The production-readiness audit (REQ-0069 L5) found that `fly.toml` defaulted `auto_stop_machines` to `"stop"`. On Fly.io, this scales the app to zero after a period of inactivity. Webhook endpoints from Shopify, Meta, and Stripe are hit unpredictably; if the machine is stopped, the first webhook after idle time pays a cold-start penalty and may time out or be retried, leading to duplicate processing and delayed fulfillment.

## Decision

Set `auto_stop_machines = "off"` and `min_machines_running = 1` in `fly.toml` for the `http_service`. This keeps at least one machine running at all times. We accept the additional machine cost in exchange for predictable webhook latency and fewer retries from external providers.

## Consequences

- Positive: webhooks are handled immediately; cold-start failures and provider retries are avoided; event bus consumer continuity is preserved.
- Negative: baseline Fly.io cost is higher because at least one machine is always billed.
- Follow-up: revisit this decision if usage becomes burstable enough that a warm-pool or always-on worker topology is cheaper, or if Fly adds faster resume semantics.

## Alternatives Considered

- **Leave auto_stop enabled:** rejected — creates cold-start risk for time-sensitive webhooks.
- **Use Fly's `min_machines_running` with auto_stop still on:** rejected — `"stop"` can still scale below the minimum under extended idle; `"off"` is the only mode that guarantees a running machine.

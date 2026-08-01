# ADR 0002: Extract AI and Webhook Processing to a Dedicated Worker

- **Status:** Proposed
- **Date:** 2026-08-01
- **Deciders:** wasim

## Context

AI generation (OpenAI completion) and inbound webhooks (Shopify, Meta, Stripe) currently run inside the Next.js request handler path. This couples async, potentially long-running work to the SSR process, consumes web-request concurrency, and can cause request timeouts or head-of-line blocking during traffic spikes.

`fly.toml` already declares a `worker` process, but it consumes the same `events` BullMQ queue and dispatches to the same handlers; the actual AI and webhook logic is still reachable from the web path.

## Decision

Move the following work out of the SSR process and into the dedicated `worker` process only:

1. `generateReply` and other OpenAI completion calls.
2. Webhook application (`applyShopifyWebhook`, Meta inbound processing, Stripe event handling).
3. Abandoned-cart sweep and campaign actions.

The web layer will continue to **receive** webhook HTTP requests and **publish** domain events to BullMQ; the worker will be the sole subscriber that performs side effects. Existing `QueueEventBus` with `jobId` dedup, retries, and `removeOnFail: false` is the transport.

## Consequences

- SSR process is no longer blocked by slow or bursty AI/webhook work.
- Worker can be scaled independently and restarted without dropping health checks.
- Adds one hop (event publish → queue → worker handle) and a hard dependency on Redis/BullMQ.
- Requires a clear rule: every side-effecting subscriber must be idempotent.

## Alternatives Considered

- **In-process background jobs with `setImmediate`:** rejected — does not survive process restart and still competes for request threads.
- **Serverless functions per job type:** rejected — adds operational complexity (Cold starts, separate packaging) beyond current team size.

# ADR 0005: Per-Tenant AI Cost Attribution and Quotas

- **Status:** Proposed
- **Date:** 2026-08-01
- **Deciders:** wasim

## Context

Free / Starter / Pro plans have a simple "AI replies per month" quota, but they do not account for the actual cost of different operations: a long reply, an image generation, a trend summary, and a webhook-triggered action all consume different amounts of tokens. As usage grows, a flat reply counter will either subsidise expensive users or over-restrict cheap ones.

## Decision

Introduce per-tenant cost attribution and a usage budget model:

1. Record per-call token counts and model name alongside each AI operation.
2. Convert tokens to a normalised "credit" unit using a per-model cost table.
3. Expose a `Usage` read model keyed by `organizationId` and `billingPeriod`.
4. Enforce a hard and soft quota: 80% warning, 100% hard stop, with an optional overage buy-in.
5. Surface the dashboard in `/settings/billing` (implementation deferred).

This is a cost-control and billing-accuracy concern, not a rate-limit replacement.

## Consequences

- Billing becomes fairer and more predictable.
- Adds telemetry and accounting overhead per AI call.
- Requires periodic updates to the cost table as provider pricing changes.

## Alternatives Considered

- **Flat per-message counter:** current approach; rejected for scale because it ignores token cost variation.
- **Post-hoc invoice based on provider bills:** rejected — too slow for quota enforcement.

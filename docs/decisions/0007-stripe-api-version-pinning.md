# ADR 0007: Pin the Stripe API version and enable TypeScript types

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Devin

## Context

The production-readiness audit (REQ-0068 M6) found that the Stripe client was using the default `apiVersion`. Stripe automatically rolls new API versions, so a newly built container could start speaking a different Stripe API shape without any code change, breaking payment flows at runtime. The `typescript: true` option was also unset, reducing compile-time coverage of Stripe API responses.

## Decision

Pin the Stripe client to `apiVersion: "2024-09-30.acacia"` and set `typescript: true` in `src/modules/organizations/infrastructure/stripe-payment-gateway.ts`. The version will only be changed deliberately, after reviewing Stripe's changelog and running regression tests for billing, checkout, and webhook fulfillment.

## Consequences

- Positive: predictable Stripe API behavior across deploys; TypeScript errors when response shapes change.
- Negative: periodic manual bumps are required to access new Stripe features or stay on a supported version. The upgrade decision is a deliberate engineering task, not an implicit dependency update.
- Follow-up: schedule a Stripe API version review as part of each quarterly dependency update cycle.

## Alternatives Considered

- **Floating (`apiVersion` omitted):** rejected — caused the original risk.
- **Use an environment variable for the version:** rejected — adds operational complexity without benefit; the version is a code contract, not runtime configuration.

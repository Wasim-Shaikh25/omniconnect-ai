# TRACKER-0078: Dynamic E-Commerce Adapters

- **Status:** In Progress (Batch 2 complete; Shopify migration queued for Batch 3)
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0078-dynamic-ecommerce-adapters.md`
- **Task:** `docs/tasks/TASK-0078-dynamic-ecommerce-adapters.md`
- **Last updated:** 2026-08-06

## 1. Summary

Progress tracker for REQ-0078: Dynamic E-Commerce Adapters.

## 2. Subtasks

### Planning
- [x] Requirement REQ-0078 approved.
- [x] Task file TASK-0078 created.
- [x] Branch created.

### Implementation
- [x] T-027: AdapterConfigMapping interface + validation schema.
- [x] T-028: ConfigInterpreter safe HTTP executor runtime.
- [x] T-029: AI adapter generation via OpenRouter.
- [x] T-030: Adapter validation against EcommerceConnector (test action).
- [x] T-031: E-commerce connection UI (`/stores/[projectId]/integrations/adapter`).
- [x] T-032: `GeneratedAdapter` model + repository with encrypted credentials.
- [x] T-037: Delete WooCommerce and BigCommerce hardcoded connectors.
- [ ] T-038: Migrate Shopify connector to dynamic mapping and delete `shopify.connector.ts`.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated if needed.

## 3. Acceptance Criteria

- [x] Batch 1 acceptance criteria met: interface, validation schema, runtime interpreter, AI generation, and test action.
- [x] Batch 2 acceptance criteria met: connection UI, encrypted persistence in `GeneratedAdapter`, `IntegrationConnectorFactory` dynamic resolution, and WooCommerce/BigCommerce connector deletion.
- [x] All verification steps above pass.

## 4. Notes / Blockers

- Status: In Progress — Batch 1 implemented in `devin/req-0078-dynamic-adapters-batch1-1786085000`; Batch 2 implemented in `devin/req-0078-dynamic-adapters-batch2-1786086000`; Shopify migration queued for Batch 3.

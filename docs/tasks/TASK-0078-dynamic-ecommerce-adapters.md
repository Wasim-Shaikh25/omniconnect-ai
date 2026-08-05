# TASK-0078: Dynamic E-Commerce Adapters

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0078-dynamic-ecommerce-adapters.md`
- **Tracker:** `docs/trackers/TRACKER-0078-dynamic-ecommerce-adapters.md`
- **Module(s):** ecommerce, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Dynamic adapter engine: config mapping + safe interpreter.
- **Last updated:** 2026-08-05

## 1. Summary

Build the dynamic adapter engine: `AdapterConfigMapping` interface, `ConfigInterpreter` safe executor, AI config generation from API docs, validation against EcommerceConnector interface, connection UI.

## 2. References

- Requirement: `docs/requirements/REQ-0078-dynamic-ecommerce-adapters.md`
- Existing interface: `src/modules/ecommerce/domain/connector.ts`
- Related files:
  - `src/modules/ecommerce/infrastructure/config-interpreter.ts` (new)
  - `src/modules/ecommerce/domain/adapter-config.ts` (new)

## 3. Implementation Plan

### Step 1 — AdapterConfigMapping Interface

Define `AdapterConfigMapping` and `EndpointMapping` types in domain layer.

### Step 2 — ConfigInterpreter

Implement `EcommerceConnector` using config mapping: `buildUrl()`, `buildHeaders()`, `extractPath()`, `mapFields()`, `interpolate()`.

### Step 3 — AI Adapter Generation

Prompt OpenRouter with e-commerce API docs → generate `AdapterConfigMapping` JSON. Validate against schema.

### Step 4 — Adapter Validation

Test generated mapping: call `getProducts()` and `fetchStoreInfo()` with user credentials before saving.

### Step 5 — Connection UI

Paste API docs URL → AI generates config → enter credentials → validate → save.

### Step 6 — Delete Hardcoded Connectors

Remove `shopify.connector.ts`, `woocommerce.connector.ts`, `bigcommerce.connector.ts`.

## 4. Subtasks

- [ ] T-027: AdapterConfigMapping interface + validation schema
- [ ] T-028: ConfigInterpreter safe HTTP executor
- [ ] T-029: AI adapter generation via OpenRouter
- [ ] T-030: Adapter validation against EcommerceConnector
- [ ] T-031: E-commerce connection UI
- [ ] T-037: Delete hardcoded connectors

## 5. Acceptance Criteria

- [ ] Matches REQ-0078 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Depends on OpenRouter client (T-016) being ready.

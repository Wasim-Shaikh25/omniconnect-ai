# TASK-0078: Dynamic E-Commerce Adapters

- **Status:** Implemented (Batch 3: Shopify multi-step migration, `shopify.connector.ts` deleted, `ConfigInterpreter` supports lookups and variable extraction)
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0078-dynamic-ecommerce-adapters.md`
- **Tracker:** `docs/trackers/TRACKER-0078-dynamic-ecommerce-adapters.md`
- **Module(s):** ecommerce, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Dynamic adapter engine: config mapping + safe interpreter.
- **Last updated:** 2026-08-06

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

- [x] Remove `woocommerce.connector.ts` and `bigcommerce.connector.ts`.
- [x] Migrate `shopify.connector.ts` to a `ConfigInterpreter` mapping that supports two-step coupon creation; then remove the class.

## 4. Subtasks

- [x] T-027: AdapterConfigMapping interface + validation schema
- [x] T-028: ConfigInterpreter safe HTTP executor runtime
- [x] T-029: AI adapter generation via OpenRouter
- [x] T-030: Adapter validation against EcommerceConnector (test action)
- [x] T-031: E-commerce connection UI (`/stores/[projectId]/integrations/adapter`)
- [x] T-032: `GeneratedAdapter` model + repository with encrypted credentials
- [x] T-037: Delete WooCommerce and BigCommerce hardcoded connectors
- [x] T-038: Migrate Shopify connector to dynamic mapping and delete `shopify.connector.ts`
- [x] T-038b: Adapter wizard review fixes — `saveGeneratedAdapter` upserts an `EcommerceConnection` so the store is marked connected; `ConnectAdapterForm` JSON credentials box accepts partial/typed input; legacy WooCommerce/BigCommerce rows raise `ProviderNotSupportedError` instead of silently falling back to the Mock connector.

## 5. Acceptance Criteria

- [x] Matches the scaffold acceptance criteria completed in this batch.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Depends on OpenRouter client (T-016) being ready.

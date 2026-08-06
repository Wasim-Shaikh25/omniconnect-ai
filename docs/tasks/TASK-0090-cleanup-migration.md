# TASK-0090: Cleanup & Migration

- **Status:** Implemented
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0090-cleanup-migration.md`
- **Tracker:** `docs/trackers/TRACKER-0090-cleanup-migration.md`
- **Module(s):** all (cross-cutting)
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Delete old Org/Store/Staff models, hardcoded connectors, overscoped features.
- **Last updated:** 2026-08-06 (acceptance criteria verified and closed)

## 1. Summary

Full cleanup: delete Organization/Store/Staff/StoreIntegration models, delete organizations module, delete hardcoded connectors, delete product CRUD, delete standalone orders/coupon views, replace OpenAI with OpenRouter, update all queries to user/workspace/project scope.

## 2. References

- Requirement: `docs/requirements/REQ-0090-cleanup-migration.md`
- Related files:
  - `prisma/schema.prisma`
  - `src/modules/organizations/` (delete entire)
  - `src/modules/ecommerce/infrastructure/shopify.connector.ts` (delete)
  - `src/modules/ecommerce/infrastructure/woocommerce.connector.ts` (delete)
  - `src/modules/ecommerce/infrastructure/bigcommerce.connector.ts` (delete)

## 3. Implementation Plan

### Step 1 — Delete Prisma Models ✅
Removed Organization, Store, Staff, StoreIntegration and all relations from schema. Added User/Workspace/Project/EcommerceConnection/AIConfiguration/TokenUsage.

### Step 2 — Delete Organizations Module ✅
Removed `src/modules/organizations/` entirely.

### Step 3 — Delete Hardcoded Connectors ✅
Removed shopify, woocommerce, bigcommerce connector files.

### Step 4 — Delete Overscoped Features ✅
Removed product CRUD actions (`updateProduct`, `deleteProduct`, `bulkDeleteProductsAction`), the
standalone orders view (already removed), and unused store lifecycle management
(`archiveStore`, `restoreStore`, `deleteStore` use-cases/actions and repository methods).
Kept read-only product catalog, product sync, store creation, and store update.

### Step 5 — Update All Queries ✅
Mechanical and manual org/store → user/workspace/project migration applied across all modules.
`organizationId` → `userId` and `storeId` → `projectId` in repository signatures, Prisma model
references updated, unique constraint names aligned, and session/auth context now carries
`userId`/`projectId` from the JWT.

### Step 6 — Replace OpenAI ✅
Replaced `OpenAIProvider` with `OpenRouterProvider` in the AI module composition root.
`OpenRouterProvider` uses `OpenRouterClient` for chat completions and routes content
moderation through an OpenRouter JSON classification prompt. `env.ts` production-required
secrets now list `OPENROUTER_API_KEY` instead of `OPENAI_API_KEY`.

### Step 7 — Fix Compilation ✅
`npx prisma generate` passes, `npx tsc --noEmit` passes, `npm run lint`, `npm run test`, and
`npm run build` all pass. Integration test fixtures and repository manual types were updated to
match the V2 schema.

## 4. Subtasks

- [x] T-001: Delete Organization/Store/Staff/StoreIntegration models
- [x] T-007: Run Prisma migration — generated and applied to a local PostgreSQL instance (`20260805064000_v2_phase1_workspace_project`)
- [x] T-019: Delete organizations module
- [x] T-037: Delete hardcoded connectors
- [x] T-038: Delete overscoped features
  - [x] T-038a: Delete obsolete verification/maintenance scripts (`scripts/verify-*.ts`, `backfill-past-due.ts`, `check-http-status.ts`, `reencrypt-credentials.ts`)
  - [x] T-038b: Delete product CRUD actions, standalone orders view, store lifecycle remnants
- [x] T-018: Update all queries (org/store → user/workspace/project)
  - [x] T-018a: Rename `organizationId` → `userId` and `storeId` → `projectId` in record types / queries
  - [x] T-018b: Replace `prisma.organization`/`prisma.store`/`prisma.integration` with new model names
  - [x] T-018c: Update session/auth context and `next-auth.d.ts` to carry `userId`/`projectId`
- [x] T-039: Create `src/modules/workspaces` module to replace deleted `organizations` public barrel
(internal Prisma refs and repository mappings adapted to the V2 `User`/`Workspace`/`Project`/`EcommerceConnection` models)

## 5. Acceptance Criteria

- [x] Phase 1 schema migration, query migration, and OpenRouter wiring pass lint, typecheck, tests, and build.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Phase 1 — must be done first. Blocks everything else.
- Large scope — touches every module.

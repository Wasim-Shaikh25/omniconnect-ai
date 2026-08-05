# TASK-0090: Cleanup & Migration

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0090-cleanup-migration.md`
- **Tracker:** `docs/trackers/TRACKER-0090-cleanup-migration.md`
- **Module(s):** all (cross-cutting)
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Delete old Org/Store/Staff models, hardcoded connectors, overscoped features.
- **Last updated:** 2026-08-05

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

### Step 4 — Delete Overscoped Features
Remove product CRUD actions, standalone orders view, store lifecycle management.

### Step 5 — Update All Queries
Change every org/store scoped query to user/workspace/project scope. Touch every module.

### Step 6 — Replace OpenAI
Remove direct OpenAI imports, wire everything through OpenRouter client.

### Step 7 — Fix Compilation 🚧
Schema generates (`prisma generate` passes). `tsc --noEmit` still has many code-level errors from deleted modules and renamed fields. Update or remove broken tests.

## 4. Subtasks

- [x] T-001: Delete Organization/Store/Staff/StoreIntegration models
- [~] T-007: Run Prisma migration — generate and apply new schema (blocks T-014, T-018; depends on T-002..T-006 across REQ-0076/0077/0080/0082/0084/0086/0088)
- [x] T-019: Delete organizations module
- [x] T-037: Delete hardcoded connectors
- [~] T-038: Delete overscoped features
  - [x] T-038a: Delete obsolete verification/maintenance scripts (`scripts/verify-*.ts`, `backfill-past-due.ts`, `check-http-status.ts`, `reencrypt-credentials.ts`)
  - [ ] T-038b: Delete product CRUD actions, standalone orders view, store lifecycle remnants
- [~] T-018: Update all queries (org/store → user/workspace/project)
  - [~] T-018a: Rename `organizationId` → `userId` and `storeId` → `projectId` in record types / queries (safe rename applied to files without existing `userId`; remaining files with duplicate `userId` need manual mapping)
  - [~] T-018b: Replace `prisma.organization`/`prisma.store`/`prisma.integration` with new model names (replaced in safe-rename pass; workspaces module still uses old model names and must be adapted)
  - [ ] T-018c: Update session/auth context and `next-auth.d.ts` to carry `userId`/`projectId`
- [~] T-039: Create `src/modules/workspaces` module to replace deleted `organizations` public barrel (shell imported; internal Prisma refs still being adapted)

## 5. Acceptance Criteria

- [ ] Matches REQ-0090 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Phase 1 — must be done first. Blocks everything else.
- Large scope — touches every module.

# TASK-0077: Workspace & Project System

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0077-workspace-project-system.md`
- **Tracker:** `docs/trackers/TRACKER-0077-workspace-project-system.md`
- **Module(s):** workspaces (new), billing
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Workspace/Project hierarchy with plan enforcement.
- **Last updated:** 2026-08-06

## 1. Summary

New `workspaces` module: Workspace + Project models, CRUD with plan limit enforcement, sidebar selector dropdown, default AI config creation per project.

## 2. References

- Requirement: `docs/requirements/REQ-0077-workspace-project-system.md`
- Related files:
  - `prisma/schema.prisma`
  - `src/modules/workspaces/` (new module)

## 3. Implementation Plan

### Step 1 — Prisma Models

Create Workspace (userId, name) and Project (workspaceId, metaAccountId, metaAccessToken, name) models with relations.

### Step 2 — Workspace CRUD

`createWorkspace()`, `renameWorkspace()`, `deleteWorkspace()` with plan limit checks on create.

### Step 3 — Project CRUD

`createProject()`, `renameProject()`, `deleteProject()` with cross-workspace project count enforcement.

### Step 4 — Sidebar Selector UI

Workspace dropdown → Project dropdown in sidebar. Store selected workspace/project in session/cookie.

## 4. Subtasks

- [x] T-002: Create Workspace/Project/EcommerceConnection Prisma models
- [x] T-014: Workspace CRUD + plan limits (implicit default workspace)
- [x] T-015: Project CRUD + plan limits
- [x] T-020: Workspace/project selector UI

## 5. Acceptance Criteria

- [x] Matches REQ-0077 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- REQ-0090 cleanup is complete; workspace/project models are in `prisma/schema.prisma`.

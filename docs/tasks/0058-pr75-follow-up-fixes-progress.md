# Task 0058: PR #75 Follow-up Blockers

- **Status:** Done
- **Spec:** [docs/specs/0058-pr75-follow-up-fixes.md](../specs/0058-pr75-follow-up-fixes.md)
- **Module(s):** auth, ecommerce, ui/settings
- **Owner:** devin
- **Changelog entry:** PR #75 E2E blocker fixes

## Description

Resolve the remaining blockers on PR #75 so it can be merged and retested end-to-end.

## Subtasks

- [x] Resolve CI `quality` smoke step failure by providing all production env vars and using the standalone server.
- [x] Fix `syncProducts` so it does not soft-delete newly synced products.
- [x] Implement grace-period account restoration in the credentials sign-in path.
- [x] Fix duplicate `<AccountActions />` rendering on `/settings/account`.
- [x] Fix bulk-delete toolbar clearing selection before success feedback.
- [x] Run local quality gates (`lint`, `typecheck`, `test`, `audit`, `build`, `build:worker`, smoke).
- [x] Update `CHANGELOG.md`.
- [x] Hand off to `testing_agent` for E2E re-test.

## Acceptance Criteria

- [x] Matches the linked spec's acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## Notes / Blockers

- `syncProducts` could not be reproduced locally via isolated `tsx` scripts; the fix moves upserts and stale-deletion into a single atomic `sync` transaction and defends against empty batches.
- Account restoration required `AccountRepository` to expose a `restoreAccount` path and `authorize` to load deleted users during the 30-day grace window.

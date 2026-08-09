# REQ-0100: Close Remaining Production-Readiness Audit Gaps

- **Status:** Implemented
- **Owner:** Backend / Security
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0100-remaining-audit-gaps.md`
- **Related Tracker:** `docs/trackers/TRACKER-0100-remaining-audit-gaps.md`
- **Source audit:** `PRODUCTION_READINESS_AUDIT.md` §4 (M3, M4), `docs/specs/current-state.md` §11.1
- **Last updated:** 2026-08-09

## 1. Summary

The production-readiness sweep in REQ-0099/REQ-0098 left three deferred code-level gaps on `main`:

- **M3** — Project/workspace creation has a check-then-insert race on names (no DB unique constraint / P2002 handling).
- **M4** — The unified-inbox "latest message per conversation" query is unbounded: it can scan every message in a conversation history because it lacks a `DISTINCT ON` + index approach and hard limit.
- **Dynamic adapter SSRF** — `ConfigInterpreter.fetchJson` validates the original URL with `assertPublicHttpUrl` but then calls native `fetch`, which follows redirects. A server returning a 3xx to a private/IP/IDN URL can bypass the guard. This is the code side of the "manual penetration test" release condition.

Out of scope for this requirement are production environment-only tasks: configuring `METRICS_TOKEN` and running the `add_story_metrics` migration in the production cluster.

## 2. Goals

- Prevent duplicate project/workspace creation from concurrent requests.
- Make the unified inbox preview query cost independent of total message history.
- Make the dynamic adapter HTTP client re-validate every URL in a redirect chain and handle internationalized domain names safely.

## 3. Non-Goals

- Production secret provisioning (`METRICS_TOKEN`).
- Executing the story-metrics migration in the production database.
- Full pen-test report or third-party penetration test; this requirement ships the automated guard regression tests that underpin that test.

## 4. Acceptance Criteria

- [x] `Project` and `Workspace` have database-level unique constraints on active names per tenant, and creation code catches `P2002` to return a deterministic error instead of leaking a 500.
- [x] `MessageRepository.listLatestByConversationIds` uses a PostgreSQL `DISTINCT ON` query with an explicit `LIMIT` and the supporting index is present in the schema/migration.
- [x] `ConfigInterpreter.fetchJson` follows at most N redirects (default 5), re-running `assertPublicHttpUrl` on every `Location`, including relative URLs and IDN/punycode hostnames.
- [x] Unit tests cover: redirect to a private IP rejected, redirect to an IDN public domain allowed, redirect loop/too-many-redirects rejected, and `P2002` duplicate project/workspace name.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, `npm run build`, and `npm audit --audit-level=moderate` all pass.
- [x] `docs/specs/current-state.md` and `CHANGELOG.md` are updated to reflect the closed gaps.

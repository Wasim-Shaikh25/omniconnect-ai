# TRACKER-0046: 0046 — Intelligence Domain Ownership Refactor

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0046-intelligence-domain-ownership.md`
- **Task:** `docs/tasks/TASK-0046-intelligence-domain-ownership.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0046.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] `ecommerce`, `crm`, `conversations`, `growth`, `branddeals` each publish their own insight/recommendation events.
- [x] `intelligence` no longer contains domain-specific detection rules for commerce/crm/conversations/growth/branddeals.
- [x] `Recommendation` records include `producedByModule`, `validFrom`, `validUntil`, `invalidatedAt`.
- [x] `intelligence` provides `prioritizeRecommendations`, `resolveConflicts`, and `expireStaleRecommendations`.
- [x] `Business Brain` consumes `getBusinessBrainContext` and can explain top insight, top recommendation, and outcome history.
- [x] `BrainConversationMemory` enforces retention via `expiresAt` and `purgeExpiredBrainMemory`.
- [x] Recommendation conflicts are surfaced in UI via `getRecommendationConflictsAction` and a conflict card.
- [x] Action plan execution dispatches through domain handlers (`executeEcommerceAction`, `executeConversationAction`, `executeGrowthAction`).
- [x] Cross-domain read models (`MetricSnapshot`, `BusinessInsight`, `Recommendation`) are recomputed asynchronously from canonical signals via `ReadModelRefresher`.
- [x] `Integration.accessToken` / `refreshToken` are encrypted at rest; connector decrypts at use time.
- [x] NextAuth `Account.access_token` / `refresh_token` / `id_token` are encrypted at rest via `EncryptedPrismaAdapter`; reads decrypt transparently and remain backwards-compatible with legacy plaintext.
- [x] `env.ts` rejects startup in production if any required secret is missing.
- [x] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [x] `CHANGELOG.md` and task tracker updated.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0046-intelligence-domain-ownership.md`.

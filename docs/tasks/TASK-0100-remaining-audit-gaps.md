# TASK-0100 — Close Remaining Production-Readiness Audit Gaps

- **Status:** Implemented
- **Owner:** devin
- **Requirement:** `docs/requirements/REQ-0100-remaining-audit-gaps.md`
- **Tracker:** `docs/trackers/TRACKER-0100-remaining-audit-gaps.md`
- **Modules:** workspaces, conversations, ecommerce, shared/security
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Close M3/M4 audit gaps and harden dynamic-adapter SSRF redirect handling.
- **Last updated:** 2026-08-09

## 1. Summary

Fix the three code-level production-readiness gaps left open after REQ-0099/REQ-0098: project/workspace name race (M3), unbounded inbox message query (M4), and dynamic adapter SSRF via redirects/IDN.

## 2. References

- `docs/specs/current-state.md` §11.1
- `PRODUCTION_READINESS_AUDIT.md` §4 (M3, M4)
- `src/modules/workspaces/infrastructure/store.repository.ts`
- `prisma/schema.prisma` (`Project`, `Workspace`, `Message`)
- `src/modules/conversations/infrastructure/message.repository.ts`
- `src/modules/ecommerce/infrastructure/config-interpreter.ts`
- `src/shared/security/outbound-url-guard.ts`

## 3. Implementation Plan

### Step 1 — M3 project/workspace name race

- Add `@@unique([userId, name])` to `Workspace` and `Project` in `prisma/schema.prisma`.
- Add Prisma migration `add_project_workspace_name_uniqueness`.
- In `PrismaStoreRepository.create` / `ensureWorkspace`, catch `Prisma.PrismaClientKnownRequestError` with code `P2002`.
  - Workspace race: retry `findFirst({ where: { userId } })` and use the existing workspace.
  - Project race: throw a domain `StoreNameExistsError` (or reuse `StoreLimitError`? create a new `StoreNameExistsError`) surfaced by `createStoreAction`.
- Add unit/integration test for concurrent or duplicate `createStore`.

### Step 2 — M4 unbounded inbox query

- Change `MessageRepository.listLatestByConversationIds` to `prisma.$queryRaw`:

```sql
SELECT DISTINCT ON ("conversationId") *
FROM "Message"
WHERE "conversationId" = ANY(${conversationIds}::text[])
ORDER BY "conversationId", "createdAt" DESC
LIMIT ${conversationIds.length}
```

- Add `@@index([conversationId, createdAt(sort: Desc)])` to `Message` model (if Prisma supports; otherwise create raw index in migration).
- Add unit/integration test with many messages per conversation.

### Step 3 — SSRF redirect/IDN hardening

- Add `fetchWithPublicRedirects(url, init, maxRedirects?)` to `outbound-url-guard.ts`:
  - `redirect: "manual"` on `fetch`.
  - Loop on 3xx status: resolve `Location` against current URL, `assertPublicHttpUrl(newUrl)`, then re-fetch.
  - Enforce `maxRedirects` (default 5).
  - Return final `Response`.
- `ConfigInterpreter.fetchJson` replaces `await fetch(url, init)` with `await fetchWithPublicRedirects(url, init)`.
- Update `assertPublicHttpUrl` or add normalisation so IDN hostnames (punycode) pass through `dns.lookup` correctly.
- Add tests in `outbound-url-guard.test.ts` and `config-interpreter.test.ts` for redirect chain and IDN.

### Step 4 — Docs

- Update `docs/specs/current-state.md` §11.1: remove/adjust M3/M4 from remaining conditions, note SSRF redirect guard.
- Update `CHANGELOG.md [Unreleased]`.

### Step 5 — Verify

- Run all quality gates and `npx tsx scripts/task-status.ts`.

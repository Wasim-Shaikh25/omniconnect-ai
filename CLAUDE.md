# CLAUDE.md

Claude Code / Claude in any IDE: **follow [`AGENTS.md`](./AGENTS.md) — it is the single
source of truth for this repository.** Everything below is a short reminder of the
non-negotiables; read `AGENTS.md` in full before your first change in a session.

## Every session, in order
1. **Read `CHANGELOG.md` first** — see Done / In Progress / Next.
2. **Read `docs/specs/current-state.md`** — understand architecture, contracts, and current behavior.
3. **Read + update the requirement** in `docs/requirements/` *before* writing code (requirement-first).
4. **Create/append a task** in `docs/tasks/` with code snippets and file references.
5. **Create/append a tracker** in `docs/trackers/` to record progress.
6. Implement to match the requirement + task.
7. **Update `docs/specs/current-state.md`** if architecture or public contracts changed.
8. **Update `CHANGELOG.md`** last (move to Done, add Next).
9. Ensure lint + typecheck + tests + build + `npx tsx scripts/task-status.ts` pass.

## Hard rules
- **Loose coupling:** never import another module's internals. Cross-module = public
  contract (application service / port) or **domain events** only. No circular deps.
- **DDD layering:** Presentation → Application → Domain ← Infrastructure. Domain is pure
  (no Prisma/fetch/env/framework).
- **Extensible connectors:** new eCommerce/AI providers = implement the interface only.
- **TypeScript strict, no `any`.** No `@ts-ignore`. Imports at top of file.
- **Never** commit secrets/`.env`, weaken security controls, or edit tests just to pass.
- **No code without a requirement. No work without a task and tracker. No session without reading the changelog and current-state.**

See `AGENTS.md` §0–§7 and `docs/architecture/` for the full standard.

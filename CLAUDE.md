# CLAUDE.md

Claude Code / Claude in any IDE: **follow [`AGENTS.md`](./AGENTS.md) — it is the single
source of truth for this repository.** Everything below is a short reminder of the
non-negotiables; read `AGENTS.md` in full before your first change in a session.

## Every session, in order
1. **Read `CHANGELOG.md` first** — see Done / In Progress / Next.
2. **Read + update the spec** in `docs/specs/` *before* writing code (spec-first).
3. **Create/append a task** in `docs/tasks/`.
4. Implement to match the spec.
5. **Update `CHANGELOG.md`** last (move to Done, add Next).
6. Ensure lint + typecheck + tests pass.

## Hard rules
- **Loose coupling:** never import another module's internals. Cross-module = public
  contract (application service / port) or **domain events** only. No circular deps.
- **DDD layering:** Presentation → Application → Domain ← Infrastructure. Domain is pure
  (no Prisma/fetch/env/framework).
- **Extensible connectors:** new eCommerce/AI providers = implement the interface only.
- **TypeScript strict, no `any`.** No `@ts-ignore`. Imports at top of file.
- **Never** commit secrets/`.env`, weaken security controls, or edit tests just to pass.
- **No code without a spec. No work without a task. No session without reading the changelog.**

See `AGENTS.md` §0–§7 and `docs/architecture/` for the full standard.

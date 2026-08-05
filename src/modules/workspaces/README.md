# Module: organizations

Multi-tenant organizations owning stores and members.

## Layers (DDD)
- `domain/` — entities, value objects, domain events, business rules (PURE, no IO).
- `application/` — use-cases, command/query handlers, ports (interfaces).
- `infrastructure/` — Prisma repositories, external API clients, queue workers, adapters.
- `presentation/` — Next.js route handlers / server actions / UI wiring.

## Public contract
Other modules interact only via `index.ts` (public barrel) or domain events:

> OrganizationService (create, addMember); events: OrganizationCreated.

**Never** import this module's internals from another module. **No circular deps.**

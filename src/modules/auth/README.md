# Module: auth

Authentication & RBAC (Email + Google, JWT sessions, roles Admin/Store Owner/Staff).

## Layers (DDD)
- `domain/` — entities, value objects, domain events, business rules (PURE, no IO).
- `application/` — use-cases, command/query handlers, ports (interfaces).
- `infrastructure/` — Prisma repositories, external API clients, queue workers, adapters.
- `presentation/` — Next.js route handlers / server actions / UI wiring.

## Public contract
Other modules interact only via `index.ts` (public barrel) or domain events:

> AuthService (authenticate, getSession, assertRole); events: UserRegistered, UserLoggedIn, UserRoleChanged.

**Never** import this module's internals from another module. **No circular deps.**

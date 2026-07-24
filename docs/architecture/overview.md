# Architecture Overview

MetaBridge AI is built with **Domain-Driven Design (DDD)**, the **Repository Pattern**, and
**Event-Driven Architecture**, organized into loosely-coupled domain **modules**. The guiding
principle: **modules must not be tightly coupled.**

## Documents
- [DDD Layers](./ddd-layers.md) — the four layers and their dependency rules.
- [Module Boundaries](./module-boundaries.md) — the modules and how they may interact.
- [Event-Driven Architecture](./event-driven.md) — domain events and async flows.

## The modules
`auth`, `users`, `organizations`, `ecommerce`, `meta`, `ai`, `coupons`, `crm`,
`conversations`, `analytics`, `reports`, `notifications`.

## Proposed source layout
```
src/
  modules/
    <module>/
      domain/          # entities, value objects, domain events, business rules (PURE)
      application/     # use-cases, command/query handlers, ports (interfaces)
      infrastructure/  # Prisma repositories, external API clients, queue workers, adapters
      presentation/    # route handlers / server actions / UI wiring for this module
      index.ts         # PUBLIC BARREL — the ONLY thing other modules may import
  shared/
    kernel/            # shared value objects, Result/Either, base Entity, DomainEvent
    events/            # event bus abstraction
    config/            # validated env/config module
    observability/     # Sentry + OpenTelemetry wiring
  app/                 # Next.js App Router (thin presentation composition)
prisma/
  schema.prisma
  migrations/
```

## Golden rules (enforced; see `AGENTS.md`)
1. **Cross-module access only via `modules/<m>/index.ts`** (public barrel) or **domain events**.
2. **No deep imports** into another module's `domain/`, `application/`, `infrastructure/`.
3. **No circular dependencies** between modules.
4. **Dependencies point inward**; the Domain layer is pure (no framework/IO).
5. **New providers = implement an interface only** (eCommerce connectors, AI providers, notification channels).

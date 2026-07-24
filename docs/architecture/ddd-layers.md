# DDD Layers

Each module is internally split into four layers. **Dependencies point inward.**

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation   Next.js route handlers / server actions / UI  │
│                — no business logic, just I/O + validation     │
├─────────────────────────────────────────────────────────────┤
│ Application    use-cases, command/query handlers, ports      │
│                orchestrates domain; defines interfaces (ports)│
├─────────────────────────────────────────────────────────────┤
│ Domain         entities, value objects, domain events, rules │
│                PURE — no Prisma, no fetch, no env, no framework│
├─────────────────────────────────────────────────────────────┤
│ Infrastructure Prisma repositories, API clients, queues,     │
│                adapters — IMPLEMENTS domain/application ports │
└─────────────────────────────────────────────────────────────┘
```

## Rules per layer

### Domain (innermost, pure)
- Entities, value objects, aggregates, domain events, invariants, pure business logic.
- **No** imports of Prisma, `fetch`, `process.env`, Next.js, or any I/O.
- Fully unit-testable without a database or network.

### Application
- Use-cases / command & query handlers orchestrate domain objects.
- Declares **ports** (interfaces) it needs: repositories, external services, event bus.
- Enforces RBAC and transaction boundaries.
- Depends on Domain only.

### Infrastructure
- **Implements** the ports declared by Application/Domain (Prisma repositories, Shopify/Meta/OpenAI
  clients, S3, BullMQ workers).
- The only layer that knows about frameworks and external systems.
- Depends inward (on Domain/Application interfaces), never the reverse.

### Presentation
- Next.js route handlers, server actions, React components for the module.
- Validates input, calls Application use-cases, maps results to responses/UI.
- No business logic.

## Dependency inversion
Application defines `interface XRepository`; Infrastructure provides `PrismaXRepository`.
Wiring happens in a composition root (per module / app bootstrap), so the Domain never
depends on concrete infrastructure. This keeps modules swappable and testable.

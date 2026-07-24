# Spec <NNNN>: <Title>

- **Module(s):** <auth | ecommerce | meta | ...>
- **Status:** Draft | In Review | Approved | Implemented | Superseded
- **Owner:** <name>
- **Related task(s):** <docs/tasks/... link>
- **Related ADR(s):** <docs/decisions/... link>
- **Last updated:** <YYYY-MM-DD>

## 1. Summary
One paragraph: what this delivers and why it matters.

## 2. Goals
- ...

## 3. Non-Goals
- ... (explicitly out of scope; reference Future Roadmap where relevant)

## 4. User Stories
- As a <role>, I want <capability> so that <outcome>.

## 5. Domain Model
Entities, value objects, aggregates, invariants, domain events this feature owns/emits.

## 6. Public Contract (how other modules interact)
- Application services / ports exposed.
- Domain events published (name, payload shape) and consumed.
- **No other module may import this module's internals** — only this contract.

## 7. Data / Persistence
Tables touched, new fields, migrations, indexes. (Prisma migrations only.)

## 8. API / UI Surface
Route handlers, server actions, pages/components, request/response shapes, RBAC rules.

## 9. External Integrations
Third-party APIs (Meta Graph, Shopify, OpenAI, S3...), auth, rate limits, webhooks, retries.

## 10. Edge Cases & Failure Modes
- ...

## 11. Security & Privacy
RBAC, PII handling, secrets, webhook signature verification, audit.

## 12. Testing Strategy
Domain unit tests, repository/connector contract tests, integration/e2e.

## 13. Acceptance Criteria (Definition of Done)
- [ ] ...

## 14. Open Questions
- ...

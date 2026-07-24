# Module Boundaries (Loose Coupling)

**Modules must not be tightly coupled.** This document defines how modules may — and may not
— interact.

## The public barrel is the boundary
Every module exposes a single public entry point: `src/modules/<module>/index.ts`.
It re-exports **only**:
- Application-layer **service interfaces / ports** and their factory,
- **Domain event** types the module publishes/consumes,
- Public **DTOs / read models**.

It **never** re-exports entities, repositories, Prisma models, or infrastructure clients.

```ts
// ✅ allowed
import { CouponService, CouponGenerated } from "@/modules/coupons";

// ❌ forbidden — deep import into another module's internals
import { CouponEntity } from "@/modules/coupons/domain/coupon.entity";
import { PrismaCouponRepository } from "@/modules/coupons/infrastructure/...";
```

## Allowed interaction styles
1. **Synchronous, via port:** Module A calls Module B's application service (from B's barrel)
   when it needs an immediate answer (e.g. `ai` asks `crm.getProfile()`).
2. **Asynchronous, via domain events:** preferred whenever a synchronous call would create
   coupling or a reactive chain (e.g. `NewFollow` → coupon → notification). Publishers don't
   know their subscribers.

## Forbidden
- Deep imports of another module's `domain/`, `application/` internals, or `infrastructure/`.
- Sharing Prisma model types across modules (map to DTOs at the boundary).
- **Circular dependencies** between modules — if A needs B and B needs A, invert one direction
  with an event or move shared concepts to `shared/kernel`.

## Ownership map (who owns which tables)
| Module         | Owns (writes)                                  |
|----------------|------------------------------------------------|
| auth / users   | Users                                          |
| organizations  | Organizations                                  |
| ecommerce      | Stores, Integrations, Products                 |
| coupons        | Coupons, CouponUsage                           |
| meta           | (raw Meta events) → Conversations, Messages, Followers |
| conversations  | Conversations, Messages (status/takeover)      |
| crm            | Customers                                      |
| ai             | AIConfigurations                               |
| analytics      | read models                                    |
| reports        | Reports                                        |
| notifications  | Notifications                                  |
| (campaigns)    | Campaigns (first-time follower campaign)       |

Other modules **read** another module's data only through that module's service/read-port —
never by querying its tables directly.

## Enforcement
- ESLint `no-restricted-imports` / import-boundary rules to block deep cross-module imports.
- Dependency-cruiser (or equivalent) in CI to detect circular dependencies and boundary violations.
- Code review checklist item: "cross-module access only via public barrel or events?"

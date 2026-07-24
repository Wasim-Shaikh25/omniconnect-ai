# Spec 0011: Users, Organizations & Stores (multi-tenant foundation)

- **Module(s):** users, organizations
- **Status:** Implemented (Phase 1)
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-030)
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Multi-tenant foundation. Every registered Store Owner gets their own **Organization**
(the tenant root). An organization owns one or more **Stores** (workspaces that later hold
eCommerce/Meta integrations, products, coupons, customers, etc.). Users have editable
profiles; Admins can change a member's role. Provisioning is **event-driven** so modules
stay loosely coupled.

## 2. Goals
- Auto-provision an Organization for each new user (via `UserRegistered` event).
- `organizations` module owns `Organization` + `Store` tables and their use-cases.
- `users` module owns user profile + membership + role changes on the `User` table.
- Store Owners can create/list Stores within their organization.
- Admins can change a user's role; users can edit their own profile.
- RBAC enforced in the presentation layer via `@/modules/auth` guards.

## 3. Non-Goals
- eCommerce/Meta connection logic (TASK-040+). Stores are just workspaces here.
- Invitations / multi-user onboarding flows (later).

## 4. Public Contract (loose coupling)
**`@/modules/organizations`:**
- Queries: `getOrganizationById`, `getOrganizationOverview(orgId)` (org + stores).
- Use-cases: `createStore`, `listStores(orgId)`.
- Events: `OrganizationCreated`, `StoreCreated`.
- Server actions: `createStoreAction`.
- Subscribers: `registerOrganizationSubscribers(bus)` — on `UserRegistered` creates an org.

**`@/modules/users`:**
- Queries: `getUserProfile(userId)`, `listOrganizationUsers(orgId)`.
- Use-cases: `updateProfile`, `changeUserRole`, `assignOrganization`.
- Events: `UserProfileUpdated`, `UserRoleChanged`.
- Server actions: `updateProfileAction`, `changeUserRoleAction`.
- Subscribers: `registerUsersSubscribers(bus)` — on `OrganizationCreated` links user → org.

> Cross-module flow is via **domain events only**. `organizations` never writes the `User`
> table; `users` never writes `Organization`. No module imports another's internals.

## 5. Event-driven provisioning flow
```
auth.registerUser
   └─▶ UserRegistered ──▶ organizations: create Organization ("<name>'s Organization")
                              └─▶ OrganizationCreated ──▶ users: set user.organizationId + role
```
Subscribers are wired once at server startup in `src/instrumentation.ts` (`register()`),
publishing/handling on the shared in-memory `eventBus`.

## 6. Data / Persistence
- `Organization` (id, name, timestamps) → `users`, `stores`.
- `Store` (id, name, provider, domain?, organizationId) → integrations/products/etc.
- `User.organizationId` (nullable), `User.storeId` (nullable, Staff scoping) via Prisma migration.
- Ownership: `organizations` owns Organization+Store; `users`/`auth` own User.

## 7. Acceptance Criteria (Definition of Done)
- [x] New registration auto-creates an Organization and links the user (event-driven).
- [x] Store Owner can create and list stores (scoped to their org).
- [x] Profile update + admin role change use-cases exposed via barrels.
- [x] `/settings` (profile) and `/stores` pages wired with RBAC.
- [x] Lint + typecheck + build pass; verified end-to-end vs Postgres; `CHANGELOG.md` updated.

## 8. Follow-ups
- Member invitations + Staff store assignment UI.
- Organization rename / billing profile.

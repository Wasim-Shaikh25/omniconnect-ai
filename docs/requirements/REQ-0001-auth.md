---
description: Authentication
---

# REQ-0001: Authentication

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** auth, users
- **Original spec path:** `docs/specs/0001-auth.md` (restructured)
- **Task:** `docs/tasks/TASK-0001-auth.md`
- **Tracker:** `docs/trackers/TRACKER-0001-auth.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0001-auth.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** auth, users
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-020)
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Email + Google login via NextAuth with JWT sessions, secure session handling, user profile management, and Role-Based Access Control (Admin, Store Owner, Staff).

## 2. Goals
- Email login and Google OAuth via NextAuth
- JWT-based sessions with secure handling (rotation, expiry)
- RBAC with roles Admin / Store Owner / Staff enforced in the application layer
- User profile management

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/requirements/REQ-0000-project-overview.md`).

## 4. Public Contract (loose coupling)
Exposed via the `@/modules/auth` barrel only:
- **Session accessors (RBAC entry points):** `getCurrentUser()`, `requireUser()`,
  `requireRole(role)` — consumed by other modules' presentation layers.
- **RBAC domain helpers:** `Role`, `ROLES`, `isRole`, `roleSatisfies` (pure, framework-free).
- **Domain events:** `UserRegistered`, `UserLoggedIn` (with typed payloads) for cross-module
  subscribers (notifications, analytics, CRM) — published on the shared in-memory event bus.
- **Use-case:** `registerUserSchema` / `RegisterUserInput` for typed registration input.
- **App composition wiring:** `handlers` (NextAuth route handlers), `loginAction`,
  `registerAction`, `signOutAction`, `googleSignInAction`, `googleAuthEnabled`.
- **Typed errors:** `AuthError`, `EmailAlreadyInUseError`, `InvalidCredentialsError`,
  `UnauthorizedError`, `ForbiddenError`.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.
> The raw NextAuth `auth`/`signIn`/`signOut` instance stays internal to the module.

## 4a. Implementation Notes
- **NextAuth (Auth.js) v5** with the **Prisma adapter** and **JWT session strategy**.
- **Providers:** Credentials (email + bcrypt password, cost 12) always on; **Google**
  auto-enabled only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are configured.
- **RBAC:** role is embedded in the JWT (`jwt` callback) and surfaced on the session
  (`session` callback). Roles form a hierarchy Admin > Store Owner > Staff via `roleSatisfies`.
- **Layering:** domain (roles/errors/events, pure) → application (ports + `registerUser`
  use-case) → infrastructure (Prisma repo, bcrypt hasher, NextAuth config, session accessors)
  → presentation (server actions) + app routes (`/login`, `/register`, `/dashboard`,
  `/api/auth/[...nextauth]`).
- New users default to `STORE_OWNER`; auto sign-in after registration.

## 5. Data / Persistence
`Users` (id, email, name, passwordHash?, provider, role, orgId, createdAt). Ownership: `auth`/`users`.
All schema changes via Prisma migrations.

## 6. Notes
Store Owner belongs to an Organization; Staff scoped to a Store. Admin is platform-wide.

## 7. Acceptance Criteria (Definition of Done)
- [x] Domain modeled (roles, errors, events) — pure, framework-free.
- [x] Application services/ports implemented and exposed via the module's public barrel.
- [x] Infrastructure adapters/repositories implemented (Prisma repo, bcrypt hasher, NextAuth).
- [x] Presentation (login/register/dashboard + route handler) wired, with RBAC session guards.
- [x] Lint + typecheck + build pass; `CHANGELOG.md` updated.
- [x] Verified end-to-end against Postgres: register → auto-login → protected dashboard →
      sign out → credentials login; password stored bcrypt-hashed.

## 8. Follow-ups (later tasks)
- Profile management UI + `updateProfile` use-case (TASK-030 Users).
- Admin-only role assignment + `UserRoleChanged` event.
- Email verification / password reset flows.
- Move JWT verification into edge middleware once split config is introduced.

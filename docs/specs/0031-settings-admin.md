# Spec 0031: Settings & Administration

- **Module(s):** users, organizations
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-330)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Extend the existing Settings area with an organization audit log and a billing page, and improve navigation between settings sections.

## 2. Goals
- Provide an admin-only audit trail of key organization events.
- Provide a billing settings page (placeholder for subscription/plan management).
- Keep profile, team members, audit, and billing accessible from `/settings`.

## 3. Non-Goals
- Payment processing, invoices, or Stripe integration in this slice.
- Automatic audit logging across every module (we seed/log role changes and store actions where already possible).
- Real-time audit streaming.

## 4. User Stories
- As an Admin, I want to see who changed roles and when.
- As a Store Owner, I want a billing page to know where plan management will live.

## 5. Public Contract
- `/settings` — profile, team members, audit log, billing navigation.
- `/settings/audit` — list of audit log entries (admin and store owner).
- `/settings/billing` — billing settings placeholder (admin and store owner).
- New `AuditLog` Prisma model and `audit` module under `users`.

## 6. Data / Persistence
- New `AuditLog` table with `id`, `organizationId`, `actorId`, `actorEmail`, `action`, `resource`, `resourceId`, `details`, `createdAt`.
- `users` module owns audit persistence.
- Existing `changeUserRoleAction` records an audit entry when a role changes.

## 7. API / UI Surface
- `/settings/audit`: admin-only, search/filter by action, paginated list (limit 100).
- `/settings/billing`: plan name, status placeholder, CTA.
- `/settings` cards link to Audit and Billing.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- Non-admin cannot view audit log.
- Empty audit log → show placeholder.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.
- Audit and billing pages restricted to `ADMIN` and `STORE_OWNER`.
- Audit entries belong to an organization; actors can be null for system events.

## 11. Testing Strategy
- Integration: audit log page renders for admin/store owner; non-admin redirect/unauthorized.
- Unit: recording an audit entry persists and lists.
- UI: empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `AuditLog` model + migration.
- [x] `audit` module with list/create use-cases, repository, and server actions.
- [x] `/settings/audit` renders audit entries (admin and store owner).
- [x] `/settings/billing` placeholder page (admin and store owner).
- [x] `/settings` links to Audit and Billing.
- [x] `changeUserRoleAction` records an audit entry.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should every module publish a domain event that the audit module subscribes to?
2. Should billing integrate with Stripe Customer Portal or just be a settings placeholder?

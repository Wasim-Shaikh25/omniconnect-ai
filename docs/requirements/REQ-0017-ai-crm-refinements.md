---
description: AI CRM Refinements — Lifecycle, Consent, Scoring, Segments
---

# REQ-0017: AI CRM Refinements — Lifecycle, Consent, Scoring, Segments

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** crm, conversations, ecommerce
- **Original spec path:** `docs/specs/0017-ai-crm-refinements.md` (restructured)
- **Task:** `docs/tasks/TASK-0017-ai-crm-refinements.md`
- **Tracker:** `docs/trackers/TRACKER-0017-ai-crm-refinements.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0017-ai-crm-refinements.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** crm, conversations, ecommerce
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-200)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Extend the existing Customer Memory (CRM) with lifecycle stage, marketing consent, dynamic engagement/lead scores, and a derived segment label. Provide a workspace-wide `/customers` directory and `/customers/[customerId]` detail view.

## 2. Goals
- Surface customer health at a glance (lifecycle, consent, scores, segment).
- Compute engagement/lead scores from workspace activity.
- Let staff update lifecycle stage and consent from the UI.
- Keep customer records tenant-scoped and auditable.

## 3. Non-Goals
- Full segment builder UI or rule-based segment persistence.
- Multi-workspace contact merge.
- Automated marketing execution based on segments.
- Notes, tasks, or campaign creation from the contact page.

## 4. User Stories
- As an Owner, I want to see all my customers in one list so I can identify high-value contacts.
- As a Manager, I want to filter by consent and lifecycle stage to target outreach.
- As a Support agent, I want to view a customer's score and recent activity before replying.

## 5. Domain Model
- `CustomerRecord` extended with:
  - `lifecycleStage`: LEAD | PROSPECT | CUSTOMER | CHURNED
  - `consent`: GRANTED | DECLINED | PENDING
  - `consentUpdatedAt`: Date | null
  - `engagementScore`: 0–100
  - `leadScore`: 0–100
  - `segment`: string (derived: VIP, Engaged, Lead, At-risk, New)
- `CustomerListView`: id, username, storeName, lifecycle, consent, scores, segment, lastActivityAt.
- `CustomerDetailView`: profile + coupons/usages + recent conversations/messages.

## 6. Public Contract
- `crmQueries.listCustomersByOrganization(organizationId, filter?)` returns `CustomerListView[]`.
- `crmQueries.getCustomerDetail(organizationId, customerId)` returns `CustomerDetailView | null`.
- `updateCustomerStageAction({ customerId, lifecycleStage })` and `updateCustomerConsentAction({ customerId, consent })`.

## 7. Data / Persistence
- Prisma `Customer` adds `lifecycleStage` (enum), `consent` (enum), `consentUpdatedAt`, and `lastActivityAt`.
- Scores are computed on read from messages, followers, and coupon usage.
- Segment label is derived from lifecycle + scores in the application layer.

## 8. API / UI Surface
- `/customers` — list with filters (search, lifecycle, consent, segment) and deep links.
- `/customers/[customerId]` — profile, scores, consent/lifecycle editor, recent activity.
- `AppHeader` adds a **Customers** global nav link.

## 9. External Integrations
- None new.

## 10. Edge Cases & Failure Models
- Customer belongs to a store outside the user's org → 404.
- No customers → empty state with "Connect Meta / simulate events" CTA.
- Missing consent → show PENDING and prompt update.

## 11. Security & Privacy
- All reads scoped through `organizationId` via stores.
- Updates require an authenticated organization member.
- No PII beyond username/email.

## 12. Testing Strategy
- Unit: score/segment calculation.
- Integration: list/detail respect org boundaries, update actions persist.
- UI: filters and empty states.

## 13. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] Schema migration adds lifecycle, consent, and last-activity fields.
- [x] `/customers` renders workspace customer list with scores and segment labels.
- [x] `/customers/[id]` shows profile, activity, and editable stage/consent.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 14. Open Questions
1. Should scores be persisted and updated by background workers?
2. Should segments be user-defined rules saved in the database?

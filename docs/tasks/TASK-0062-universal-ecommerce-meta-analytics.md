# TASK-0062: Universal E-commerce Connectors + Meta Business Growth Analytics

- **Status:** Completed
- **Owner:** Devin
- **Module(s):** ecommerce, meta, analytics, coupons, ai, crm, conversations
- **Requirement:** `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- **Tracker:** `docs/trackers/TRACKER-0062-universal-ecommerce-meta-analytics.md`
- **Changelog entry:** See `CHANGELOG.md` for TASK-0062.
- **Last updated:** 2026-07-29

## 1. Summary

Implementation task for REQ-0062. Implementation details and code references were captured in the original spec and should be expanded here as work is touched.

## 2. References

- Requirement: `docs/requirements/REQ-0062-universal-ecommerce-meta-analytics.md`
- Tracker: `docs/trackers/TRACKER-0062-universal-ecommerce-meta-analytics.md`

## 3. Implementation Plan

- Review the requirement and original design.
- Identify affected modules, pages, and repositories.
- Implement changes, respecting DDD module boundaries.
- Add/update tests and run quality gates.

## 4. Subtasks

- [x] Review requirement and current state.
- [x] Design connector contract extensions and schema additions.
- [x] Implement WooCommerce connector.
- [x] Implement BigCommerce connector.
- [x] Document Magento connector as follow-up.
- [x] Add Prisma migration and update sync logic with attribution.
- [x] Extend analytics for growth/attribution/coupon/new-customer metrics.
- [x] Add best-time-to-post and content calendar.
- [x] Update `CHANGELOG.md`.
- [x] Run lint + typecheck + tests + build.

## 5. Acceptance Criteria

- [x] Matches the linked requirement.
- [x] Quality gates pass.
- [x] `CHANGELOG.md` updated if needed.

## 6. Notes / Blockers

- Migrated from legacy spec `docs/specs/0062-universal-ecommerce-meta-analytics.md`.

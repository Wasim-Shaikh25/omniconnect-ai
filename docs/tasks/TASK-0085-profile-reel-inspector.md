# TASK-0085: Profile & Reel Inspector

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0085-profile-reel-inspector.md`
- **Tracker:** `docs/trackers/TRACKER-0085-profile-reel-inspector.md`
- **Module(s):** inspector (new)
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Profile inspector with AI demographics and confidence tiers.
- **Last updated:** 2026-08-05

## 1. Summary

Build profile inspector using Business Discovery API + AI demographic estimation. Three-tier confidence system. Audience quality scoring. Growth trend analysis.

## 2. References

- Requirement: `docs/requirements/REQ-0085-profile-reel-inspector.md`
- Related files:
  - `src/modules/inspector/` (new module)

## 3. Implementation Plan

### Step 1 — Business Discovery API Fetch
Fetch public profile data: followers, media count, biography, recent media with engagement.

### Step 2 — AI Demographic Estimation
Collect signals: comment languages, posting times, hashtag localities, tagged locations. Send to OpenRouter for demographic estimation with confidence scores.

### Step 3 — Confidence Tier System
High (70%+): show data normally. Medium (40-70%): show with "estimated" label. Low (<40%): show "insufficient data".

### Step 4 — Audience Quality Scoring
Follower-to-engagement ratio, comment spam pattern detection, like velocity analysis.

### Step 5 — Growth Trend
Periodic follower count snapshots via Business Discovery. Classify: growing, stable, declining.

### Step 6 — Inspector UI
Username input, results dashboard with confidence labels, top content grid, growth chart.

## 4. Subtasks

- [ ] T-055: Business Discovery API fetch + AI estimation
- [ ] T-056: Confidence tier system
- [ ] T-057: Inspector UI
- [ ] T-060: Audience quality scoring

## 5. Acceptance Criteria

- [ ] Matches REQ-0085 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Business Discovery API only works with Business/Creator accounts.

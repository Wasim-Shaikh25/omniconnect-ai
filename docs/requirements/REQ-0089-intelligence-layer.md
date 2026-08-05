---
description: Intelligence Layer
---

# REQ-0089: Intelligence Layer

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0089-intelligence-layer.md`
- **Related Tracker:** `docs/trackers/TRACKER-0089-intelligence-layer.md`
- **Supersedes:** `REQ-0033-unified-intelligence-layer.md`, `REQ-0065-remaining-intelligence-completion.md`
- **Last updated:** 2026-08-05

## 1. Summary

Keep and expand all existing intelligence features. Business analysis is a competitive advantage area — go as deep as possible. Features: Daily Brief, Marketing Brain/Memory, Next Best Action, Signal Detection, Predictions, Hypotheses, Business Learnings, Operating Model health scoring.

## 2. Goals

- Daily Brief: AI-generated morning summary of key metrics, trends, and action items.
- Marketing Brain/Memory: persistent context of what's working, what's been tried, brand voice.
- Next Best Action: AI recommends what to do next based on data signals.
- Signal Detection: automatic detection of anomalies (sudden engagement drop, viral post).
- Predictions: AI forecasts (sales projections, follower growth, campaign performance).
- Hypotheses: AI generates and tracks business hypotheses.
- Business Learnings: accumulated insights from data.
- Operating Model: full business model analysis with health scoring.

## 3. Non-Goals

- Automated execution of intelligence recommendations (human reviews first).
- Real-time alerting (batch processing at scheduled intervals).

## 4. User Stories

- As a merchant, I want an AI morning brief summarizing what happened overnight.
- As a user, I want the AI to remember what worked and what didn't across campaigns.
- As a user, I want AI predictions about future sales and follower growth.
- As a user, I want anomaly detection alerting me to sudden changes.

## 5. Acceptance Criteria

- [ ] Daily Brief: generated on schedule, covers key metrics + trends + action items.
- [ ] Marketing Brain: persistent context stored per project, updated after each campaign.
- [ ] Next Best Action: ranked recommendations with confidence scores.
- [ ] Signal Detection: anomaly detection for engagement, sales, follower changes.
- [ ] Predictions: forecasts with confidence intervals.
- [ ] Hypotheses: AI-generated, tracked over time with validation status.
- [ ] Business Learnings: accumulated, searchable, referenced in AI replies.
- [ ] Intelligence features gated by plan tier.

## 6. Scope & Dependencies

- Modules: `intelligence`
- Depends on: REQ-0086 (OpenRouter for AI), REQ-0083 (analytics data)

## 7. Open Questions

None — decision to keep everything confirmed in planning.

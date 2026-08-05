# TASK-0082: AI Setup & Configuration

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0082-ai-setup-configuration.md`
- **Tracker:** `docs/trackers/TRACKER-0082-ai-setup-configuration.md`
- **Module(s):** ai-config (new)
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Per-project AI setup: personality, skills, guardrails, channels.
- **Last updated:** 2026-08-05

## 1. Summary

Per-project AI configuration UI and backend. Sections: General (name, personality, voice), Skills & Tools (toggles + sub-settings), Channel Settings (per-channel tone/hours), Escalation, Knowledge Base, Model Selection.

## 2. References

- Requirement: `docs/requirements/REQ-0082-ai-setup-configuration.md`
- Related files:
  - `src/modules/ai-config/` (new module)
  - `prisma/schema.prisma` (AIConfiguration model)

## 3. Implementation Plan

### Step 1 — AIConfiguration Prisma Model
Store: aiName, personalityPrompt, brandVoice, language, enabledSkills (JSON), salesRules (JSON), channelSettings (JSON), escalationRules (JSON), modelOverrides (JSON), knowledgeBase (text).

### Step 2 — AI Setup UI: General
AI name input, personality prompt rich text editor with variable insertion ({{ai_name}}, {{brand_name}}, etc.), brand voice selector, language multi-select.

### Step 3 — AI Setup UI: Skills & Tools
Toggle switches for each skill. Sub-settings for createCoupon: max discount, max uses, daily budget, auto-send mode.

### Step 4 — AI Setup UI: Channel Settings
Per-channel (IG DM, FB Messenger, WhatsApp): enable/disable, tone selector, business hours picker.

### Step 5 — AI Setup UI: Escalation
Rules for complaint, refund request, low confidence. Notification preferences (push + email).

### Step 6 — Knowledge Base
Upload PDF/MD files. Auto-sync product data from e-commerce adapter. Custom instructions text area.

### Step 7 — Model Selection
Per-skill model override dropdown populated from OpenRouter model list. Plan-restricted options.

### Step 8 — System Prompt Builder
`buildSystemPrompt()`: interpolate variables, append skill rules, knowledge base, escalation config.

## 4. Subtasks

- [x] T-004: Create AIConfiguration Prisma model
- [x] T-046: AI Setup UI: personality prompt editor
- [x] T-047: AI Setup UI: skills & permissions toggles
- [x] T-048: AI Setup UI: sales rules
- [x] T-049: AI Setup UI: channel settings
- [ ] T-050: Knowledge base file upload (PDF/MD) + product auto-sync
- [x] T-051: Escalation rules
- [x] T-052: Model selection per skill
- [x] T-053: System prompt builder

## 5. Acceptance Criteria

- [x] Matches REQ-0082 acceptance criteria (PDF/MD file upload still open).
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

None.

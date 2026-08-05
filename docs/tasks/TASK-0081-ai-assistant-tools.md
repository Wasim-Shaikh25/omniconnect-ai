# TASK-0081: AI Assistant & Tools

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0081-ai-assistant-tools.md`
- **Tracker:** `docs/trackers/TRACKER-0081-ai-assistant-tools.md`
- **Module(s):** ai, coupons, ecommerce, messaging, analytics
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — AI assistant with function calling tools and coupon flow.
- **Last updated:** 2026-08-05

## 1. Summary

ChatGPT-style AI assistant with OpenRouter function calling. Five tools: createCoupon, injectCoupon, sendMessage, queryAnalytics, generateDashboard. Real-time coupon creation + injection flow. Tool executor with guardrail enforcement.

## 2. References

- Requirement: `docs/requirements/REQ-0081-ai-assistant-tools.md`
- Related files:
  - `src/modules/ai/domain/tools.ts` (new)
  - `src/modules/ai/application/tool-executor.ts` (new)
  - `src/modules/ai/presentation/chat-api.ts` (new)

## 3. Implementation Plan

### Step 1 — Chat Session Management
ChatSession + ChatMessage Prisma models. CRUD: create, list, delete, rename sessions.

### Step 2 — AI Chat Endpoint
Streaming responses via OpenRouter. Pass tool definitions. Handle tool_calls in response.

### Step 3 — AI Tool Definitions
OpenRouter function calling schema for 5 tools with parameter definitions.

### Step 4 — Tool Executor with Guardrails
Execute tool calls. createCoupon: check maxDiscountPct, dailyBudget. sendMessage: check autoSend flag.

### Step 5 — Real-Time Coupon Flow
createCoupon → injectCoupon (push to e-commerce) → generate checkout link → sendMessage to customer.

### Step 6 — Chat UI
Full-screen chat, message bubbles, streaming text, markdown rendering, session sidebar.

## 4. Subtasks

- [ ] T-039: Chat session management
- [ ] T-040: AI chat endpoint (streaming + tools)
- [ ] T-041: AI tool definitions
- [ ] T-042: Tool executor with guardrails
- [ ] T-043: Real-time coupon flow
- [ ] T-044: Chat UI
- [ ] T-045: Chat history sidebar

## 5. Acceptance Criteria

- [ ] Matches REQ-0081 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Depends on OpenRouter (T-016), AI config (T-046), dynamic adapter (T-028).

---
description: AI Assistant & Tools
---

# REQ-0081: AI Assistant & Tools

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0081-ai-assistant-tools.md`
- **Related Tracker:** `docs/trackers/TRACKER-0081-ai-assistant-tools.md`
- **Supersedes:** `REQ-0004-ai-assistant.md`
- **Last updated:** 2026-08-05

## 1. Summary

ChatGPT-style AI assistant with OpenRouter function calling. Five AI tools: createCoupon, injectCoupon, sendMessage, queryAnalytics, generateDashboard. Real-time coupon creation and injection flow during customer conversations. Tool execution with guardrail enforcement (max discount, daily budget, auto-send vs. suggest-only).

## 2. Goals

- Chat session management: create, list, delete, rename sessions.
- Streaming AI responses via OpenRouter with tool calling.
- Five AI tools with OpenRouter function calling schema.
- Tool executor with guardrail enforcement from AIConfiguration.
- Real-time coupon flow: createCoupon → injectCoupon → generateCheckoutLink → sendMessage.
- Chat UI: full-screen chat, message bubbles, streaming, markdown rendering.

## 3. Non-Goals

- Voice/audio AI interaction.
- Image generation tools.
- Direct database manipulation by AI.

## 4. User Stories

- As a user, I want to chat with an AI that knows my products, orders, and customer data.
- As a user, I want the AI to create custom coupons during customer conversations.
- As a user, I want the AI to enforce my discount limits automatically.
- As a user, I want generated dashboards rendered visually in the chat.

## 5. Acceptance Criteria

- [ ] ChatSession + ChatMessage models in database.
- [ ] AI chat endpoint with streaming responses via OpenRouter.
- [ ] createCoupon tool respects maxDiscountPct and dailyBudget from AIConfiguration.
- [ ] injectCoupon pushes coupon to e-commerce platform via dynamic adapter.
- [ ] sendMessage respects autoSend flag (send immediately or suggest-only).
- [ ] queryAnalytics returns structured data from business metrics.
- [ ] generateDashboard returns JSON schema rendered by DynamicDashboard component.
- [ ] Chat UI with session sidebar, streaming, markdown rendering.

## 6. Scope & Dependencies

- Modules: `ai`, `coupons`, `ecommerce`, `messaging`, `analytics`
- Depends on: REQ-0082 (AI config for guardrails), REQ-0086 (OpenRouter), REQ-0078 (adapter for coupon injection)
- Augmented by: REQ-0091 (`queryAnalytics`/`generateDashboard` emit a validated `AnalysisSpec` executed by the deterministic engine; the LLM narrates results and never produces the numbers)

## 7. Code Snippets

### AI Tool Definitions

```ts
// src/modules/ai/domain/tools.ts

const AI_TOOLS: OpenRouterTool[] = [
  {
    type: "function",
    function: {
      name: "createCoupon",
      description: "Create a custom coupon on the connected e-commerce platform",
      parameters: {
        type: "object",
        properties: {
          discountType: { type: "string", enum: ["percentage", "fixed"] },
          amount: { type: "number" },
          code: { type: "string" },
          expiresInHours: { type: "number" },
          maxUses: { type: "number" },
          productIds: { type: "array", items: { type: "string" } },
        },
        required: ["discountType", "amount"],
      },
    },
  },
  // injectCoupon, sendMessage, queryAnalytics, generateDashboard ...
];
```

### Tool Executor with Guardrails

```ts
// src/modules/ai/application/tool-executor.ts

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const rules = context.aiConfig.salesRules;

  switch (toolName) {
    case "createCoupon": {
      if (args.discountType === "percentage" && args.amount > rules.maxDiscountPct) {
        return { error: `Max discount is ${rules.maxDiscountPct}%. Requested ${args.amount}%.` };
      }
      const todaySpend = await couponRepo.getTodayDiscountValue(context.projectId);
      if (todaySpend + estimateValue(args) > rules.dailyBudget) {
        return { error: `Daily coupon budget ($${rules.dailyBudget}) would be exceeded.` };
      }
      const code = args.code || generateUniqueCode();
      const coupon = await couponService.create({
        projectId: context.projectId,
        code,
        discountType: args.discountType,
        amount: args.amount,
        expiresAt: args.expiresInHours
          ? new Date(Date.now() + args.expiresInHours * 3600000)
          : null,
        maxUses: args.maxUses ?? 1,
        source: "ai_conversation",
        conversationId: context.conversationId,
      });
      return { couponId: coupon.id, code: coupon.code, status: "created_in_db" };
    }

    case "injectCoupon": {
      const coupon = await couponRepo.findById(args.couponId);
      const connector = await adapterService.getConnector(context.projectId);
      await connector.generateCoupon({
        code: coupon.code,
        discountPct: coupon.amount,
        expiresAt: coupon.expiresAt,
      });
      const link = await attributionService.createLink({
        projectId: context.projectId,
        couponId: coupon.id,
        utmSource: "ai_conversation",
        utmMedium: context.channel,
      });
      await couponRepo.update(coupon.id, { status: "injected", checkoutLink: link.fullUrl });
      return { code: coupon.code, checkoutLink: link.fullUrl, status: "live_on_platform" };
    }

    case "sendMessage": {
      if (!rules.autoSend) {
        return { status: "suggest_only", message: args.text, requiresApproval: true };
      }
      await messageSender.send({
        channel: context.channel,
        conversationId: context.conversationId,
        message: args.text,
      });
      return { status: "sent" };
    }
  }
}
```

## 8. Open Questions

None.

---
description: OpenRouter Integration
---

# REQ-0086: OpenRouter Integration

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0086-openrouter-integration.md`
- **Related Tracker:** `docs/trackers/TRACKER-0086-openrouter-integration.md`
- **Last updated:** 2026-08-05

## 1. Summary

Replace direct OpenAI integration with OpenRouter as a unified AI gateway. Single API (`POST /api/v1/chat/completions`), 200+ models, per-feature model routing. Environment-configurable default and feature-specific models. Plan-level model restrictions. Token usage tracking per user/model/feature.

## 2. Goals

- OpenRouterClient: API wrapper with streaming, tool calling, usage tracking.
- Per-feature model routing: `getModelForFeature()` with priority: project override → env config → default.
- Plan-based model restrictions: Free (gpt-4o-mini only), Pro (GPT-4o, Claude, Llama), Business (any).
- Replace all existing OpenAI imports with OpenRouter client.
- Token usage tracking: per user, model, feature, day.

## 3. Non-Goals

- Running local/self-hosted models.
- Fine-tuning models.
- Direct OpenAI/Anthropic API access (everything goes through OpenRouter).

## 4. User Stories

- As a user, I want to choose which AI model powers each feature (replies, dashboards, content).
- As a free user, I can only use gpt-4o-mini.
- As a Pro user, I can use GPT-4o, Claude, and Llama models.
- As a user, I want to see my AI token usage and cost.

## 5. Acceptance Criteria

- [ ] OpenRouterClient with chat, streaming, tool calling support.
- [ ] Environment vars: `OPENROUTER_API_KEY`, `AI_DEFAULT_MODEL`, `AI_REPLY_MODEL`, `AI_DASHBOARD_MODEL`, `AI_CONTENT_MODEL`.
- [ ] `getModelForFeature()` resolves: project override → env → default.
- [ ] `validateModelAccess()` checks plan.allowedModels before API call.
- [ ] Token usage recorded per request (model, tokens, cost).
- [ ] All existing OpenAI imports replaced with OpenRouter.

## 6. Scope & Dependencies

- Modules: `ai`
- Depends on: None (can start immediately)
- Blocks: REQ-0081 (AI assistant), REQ-0082 (AI config), REQ-0085 (Inspector)
- External: OpenRouter API (https://openrouter.ai/api/v1)

## 7. Code Snippets

### OpenRouter Client

```ts
// src/modules/ai/infrastructure/openrouter-client.ts

class OpenRouterClient {
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(private config: OpenRouterConfig) {}

  async chat(input: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    tools?: OpenRouterTool[];
    response_format?: { type: string };
    temperature?: number;
    max_tokens?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": this.config.siteUrl ?? "",
        "X-Title": this.config.siteName ?? "OmniConnect AI",
      },
      body: JSON.stringify({
        model: input.model ?? this.config.defaultModel,
        messages: input.messages,
        tools: input.tools,
        response_format: input.response_format,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens,
      }),
    });

    const data = await response.json();
    if (data.usage) {
      await this.trackUsage({
        model: input.model ?? this.config.defaultModel,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        cost: data.usage.total_cost,
      });
    }
    return data.choices[0].message;
  }
}
```

### Per-Feature Model Routing

```ts
// src/modules/ai/application/model-router.ts

function getModelForFeature(
  feature: "reply" | "dashboard" | "content" | "inspector" | "analysis",
  aiConfig?: AIConfiguration,
): string {
  const overrides = aiConfig?.modelOverrides ?? {};
  switch (feature) {
    case "reply":      return overrides.reply     ?? env.AI_REPLY_MODEL     ?? env.AI_DEFAULT_MODEL;
    case "dashboard":  return overrides.dashboard ?? env.AI_DASHBOARD_MODEL ?? env.AI_DEFAULT_MODEL;
    case "content":    return overrides.content   ?? env.AI_CONTENT_MODEL   ?? env.AI_DEFAULT_MODEL;
    case "inspector":  return overrides.inspector ?? env.AI_DEFAULT_MODEL;
    case "analysis":   return overrides.analysis  ?? env.AI_DASHBOARD_MODEL ?? env.AI_DEFAULT_MODEL;
  }
}

function validateModelAccess(model: string, plan: SubscriptionPlan): boolean {
  return plan.allowedModels.includes(model);
}
```

## 8. Open Questions

None.

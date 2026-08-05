---
description: AI Setup & Configuration
---

# REQ-0082: AI Setup & Configuration

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0082-ai-setup-configuration.md`
- **Related Tracker:** `docs/trackers/TRACKER-0082-ai-setup-configuration.md`
- **Last updated:** 2026-08-05

## 1. Summary

Per-project AI agent configuration UI. Users configure personality prompt (with {{variables}}), skills/permissions toggles, sales guardrails (max discount, daily budget, auto-send), channel-specific settings (tone, hours), escalation rules, knowledge base upload, and per-skill model selection via OpenRouter.

## 2. Goals

- AIConfiguration model: personality, skills, guardrails, channel settings, escalation, model overrides.
- AI Setup UI with sections: General, Skills & Tools, Channel Settings, Escalation, Knowledge Base, Model Selection.
- System prompt builder: interpolate variables, append skill rules, knowledge base, escalation config.
- Per-channel AI settings: enable/disable, tone, business hours.
- Guardrails: max discount %, max uses per coupon, daily budget, auto-send toggle.

## 3. Non-Goals

- Multi-language AI responses (initial scope: single language per project).
- A/B testing of AI personalities.

## 4. User Stories

- As a user, I want to configure my AI agent's personality and brand voice per project.
- As a user, I want to control which tools/skills the AI can use.
- As a user, I want to set maximum discount limits so the AI can't give away too much.
- As a user, I want different AI behavior per messaging channel.
- As a user, I want the AI to escalate to me on complaints or refund requests.

## 5. Acceptance Criteria

- [ ] AIConfiguration model stores all settings per project.
- [ ] Personality prompt editor supports {{ai_name}}, {{brand_name}}, {{top_products}}, etc.
- [ ] Skills toggles: createCoupon, sendMessage, generateDashboard, accessOrderData, triggerCampaigns.
- [ ] Sales rules: maxDiscountPct (0-100), maxUses (1-100), dailyBudget (dollars), autoSend (boolean).
- [ ] Channel settings: per-channel enable, tone, business hours.
- [ ] Escalation rules: on complaint, on refund request, on low confidence.
- [ ] Knowledge base upload: PDF, MD files + auto-sync with product data.
- [ ] Model selection: per-skill model override via OpenRouter model list.
- [ ] System prompt builder produces complete prompt from config.

## 6. Scope & Dependencies

- Modules: `ai-config` (new)
- Depends on: REQ-0077 (Project), REQ-0086 (OpenRouter for model list)

## 7. Code Snippets

### System Prompt Builder

```ts
// src/modules/ai-config/application/build-system-prompt.ts

function buildSystemPrompt(config: AIConfiguration, projectData: ProjectContext): string {
  const variables = {
    "{{ai_name}}": config.aiName,
    "{{brand_name}}": projectData.companyName,
    "{{product_count}}": String(projectData.productCount),
    "{{top_products}}": projectData.topProducts.map(p => p.title).join(", "),
    "{{store_url}}": projectData.storeUrl,
  };

  let prompt = config.personalityPrompt;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replaceAll(key, value);
  }

  if (config.enabledSkills.createCoupon) {
    prompt += `\n\nYou can create coupons. Rules: max ${config.salesRules.maxDiscountPct}% discount, ` +
      `max ${config.salesRules.maxUses} uses, daily budget $${config.salesRules.dailyBudget}. ` +
      (config.salesRules.autoSend ? "Auto-send enabled." : "Suggest only — wait for owner approval.");
  }

  if (config.knowledgeBase) {
    prompt += `\n\nKnowledge base:\n${config.knowledgeBase}`;
  }

  prompt += `\n\nEscalation: ` + JSON.stringify(config.escalationRules);
  return prompt;
}
```

## 8. Open Questions

None.

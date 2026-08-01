# ADR 0004: Record Plan for a Second LLM Provider

- **Status:** Proposed
- **Date:** 2026-08-01
- **Deciders:** wasim

## Context

All AI completions currently route through `OpenAIProvider` behind the `AIProvider` interface. A single-provider setup creates two risks: an outage at OpenAI makes the AI assistant unavailable, and a price change leaves no negotiation lever.

## Decision

Keep the `AIProvider` interface and add a second provider (initially **Anthropic Claude**) as a fallback. The first step is to implement the interface; routing policy will come later.

1. Implement `AnthropicProvider` with the same `complete(messages, options)` contract as `OpenAIProvider`.
2. Add provider selection config (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_PROVIDER=openai|anthropic|fallback`).
3. "fallback" tries OpenAI first; on timeout, rate-limit, or 5xx, switches to Anthropic.
4. Reuse the same prompt-injection and PII-redaction sanitisation pipeline.

No code is required immediately; this ADR records the agreed direction.

## Consequences

- Removes single-provider availability risk.
- Adds API-key management and a small routing layer.
- Cost attribution per provider becomes more important (see ADR 0005).

## Alternatives Considered

- **Self-hosted model:** rejected — inference infrastructure is out of scope for the current phase.
- **Multiple OpenAI models only:** rejected — does not address provider outage.

---
description: Deterministic Analysis Engine with AI Narration
---

# REQ-0091: Deterministic Analysis Engine (AnalysisSpec) with AI Narration

- **Status:** In Progress
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0091-deterministic-analysis-engine.md`
- **Related Tracker:** `docs/trackers/TRACKER-0091-deterministic-analysis-engine.md`
- **Augments:** `REQ-0081-ai-assistant-tools.md` (queryAnalytics/generateDashboard), `REQ-0083-business-intelligence.md`, `REQ-0079-meta-growth-engine.md`, `REQ-0085-profile-reel-inspector.md`, `REQ-0089-intelligence-layer.md`
- **Last updated:** 2026-08-05

## 1. Summary

Establish a three-layer analytics pipeline so that **every metric shown to a user is computed
deterministically by auditable code, and the LLM is used only to explain results and drive
direction — never to produce numbers.**

The three layers are:

1. **Deterministic layer (scripts / pure functions):** all math — engagement scoring, percentile
   rank, z-score / EWMA anomaly detection, attribution windowing, correlation, cohort trends,
   revenue aggregation. Reproducible and unit-testable. No AI.
2. **Small-model layer (local, cheap):** a MiniLM sentence-embedding model (run in-process via
   `transformers.js`, no Python service) plus a BM25 lexical matcher. Used for *fuzzy* problems —
   mapping a natural-language question to a whitelisted analysis operation, hashtag semantic
   relevance, comment-language / topic signals. Deterministic given the same model + input.
3. **LLM layer (OpenRouter):** narration only. Given a computed `AnalysisResult` (hard numbers +
   evidence), the LLM writes the "why," the recommended next action, and dashboard copy. It never
   sees a request to compute or invent a number.

The connective tissue is **`AnalysisSpec`** — a constrained, validated intermediate representation.
When the AI assistant needs analysis (REQ-0081 `queryAnalytics` / `generateDashboard`), it emits an
`AnalysisSpec` selecting one operation from a fixed vocabulary — **it does not write or execute
code.** A safe `AnalysisEngine` validates the spec against the whitelist, executes the matching pure
operation within the caller's project scope, and returns real numbers. This is the same security
posture already chosen for e-commerce adapters in REQ-0078: *AI emits a config, a safe interpreter
executes it.*

The result: faster analysis (local math beats a round-trip to a frontier model), cheaper (the LLM
only narrates pre-computed facts, cutting token spend), more accurate (no hallucinated metrics), and
reproducible (golden tests pin every operation's output). Ad-hoc and single-entity questions ("why
did this reel flop?", a specific post/reel ID lookup) resolve to a whitelisted operation and return
100%-accurate numbers; a question that maps to no operation is reported as unsupported rather than
answered with an invented figure.

## 2. Goals

- Define `AnalysisSpec` — a typed, validated spec with a **closed vocabulary** of analysis
  operations. No free-form code, no `eval`, no dynamic query strings.
- Build `AnalysisEngine` — a safe interpreter that validates a spec and dispatches to pure
  operation functions, always scoped to the caller's `projectId`.
- Implement a deterministic **operation library**: `single_post_analysis`, `top_n`,
  `compare_period`, `anomaly_check`, `cohort_trend`, `attribution_breakdown`, `best_time`,
  `correlation`, `profile_quality`.
- Add an `EmbeddingProvider` port + a local MiniLM/BM25 adapter for the fuzzy resolver.
- Build `OperationResolver` — natural-language question → `AnalysisSpec` with a confidence score and
  an explicit "unsupported" outcome below threshold.
- Add a **narration** service — LLM turns an `AnalysisResult` into prose (why / next action /
  dashboard copy) with the numbers passed in as immutable facts.
- Wire REQ-0081's `queryAnalytics` and `generateDashboard` tools to emit `AnalysisSpec`.
- **Modify implemented features that currently ask the LLM to produce numbers** (see §9).
- Golden/snapshot tests guaranteeing each operation is reproducible for a fixed dataset.

## 3. Non-Goals

- AI-generated code executed on the server (explicitly rejected — same stance as REQ-0078).
- A user-facing SQL / query builder (the vocabulary is the only surface).
- Replacing the intelligence engines that are **already deterministic** (see §9 — they need no
  change, only to be re-scoped to project by REQ-0090).
- Real-time streaming analytics (batch / on-request, consistent with REQ-0083).
- Training or fine-tuning models (MiniLM is used off-the-shelf for embeddings only).

## 4. User Stories

- As a merchant, I want to ask "why did this reel underperform?" and get an explanation grounded in
  the reel's real percentile rank against my baseline — not a guessed narrative.
- As a merchant, I want a dashboard the AI generated from my question to show numbers I can trust,
  because a script computed them and the AI only wrote the labels.
- As a user, I want the assistant to say "I can't analyze that yet" when my question doesn't map to
  a supported analysis, instead of inventing a figure.
- As an operator, I want every number on screen to be reproducible and unit-tested.
- As a founder, I want analysis to be fast and cheap so I can run it on every post without worrying
  about AI cost.

## 5. Acceptance Criteria

- [x] `AnalysisSpec` type defined with a closed `operation` enum and validated params per operation.
- [x] `AnalysisEngine.run(spec, ctx)` validates the spec, rejects unknown operations, and executes
      only within `ctx.projectId` scope (cross-project data access is impossible by construction).
- [x] Operation library implemented as **pure functions** with no I/O in the compute step (data is
      fetched by the engine, passed in, then computed). (Batch 1: `stats`, `single_post_analysis`; Batch 2: remaining operations.)
- [ ] `EmbeddingProvider` port defined; local MiniLM adapter loads via `transformers.js` with no
      network call at inference and no Python dependency.
- [ ] `OperationResolver` returns `{ spec, confidence }` or `{ unsupported: true, reason }` below a
      configurable confidence threshold.
- [ ] Narration service receives `AnalysisResult` and returns prose; a test asserts that **no
      numeric token in the narration is absent from the computed result** (no invented numbers).
- [ ] REQ-0081 `queryAnalytics` and `generateDashboard` emit an `AnalysisSpec` and render results
      via the DynamicDashboard component (REQ-0083).
- [x] `analyze-media.ts` refactored: verdict + evidence computed deterministically; LLM narrates
      only (see §9).
- [ ] `generate-trends.ts` refactored: `predictedEngagementScore`, `predictedRevenue`, and
      `bestTimeToPost` sourced from deterministic engines, not invented by the LLM (see §9).
- [ ] Golden tests: each operation produces identical output for a fixed fixture dataset.
- [x] No `eval`, `Function`, or dynamic code execution anywhere in the engine.

## 6. Scope & Dependencies

- Modules: `analytics` (new `analysis/` engine), `ai` (narration + resolver + tool wiring),
  `intelligence` (consumes engine), `content` (trends), `inspector` (profile quality).
- New infra: `EmbeddingProvider` port + local MiniLM adapter (`@xenova/transformers` /
  transformers.js) + BM25 matcher.
- Depends on: REQ-0086 (OpenRouter for narration), REQ-0077 (Project scope), REQ-0090 (query
  re-scoping org/store → project — the engine is built project-scoped from day one).
- Augments: REQ-0081, REQ-0083, REQ-0079, REQ-0085, REQ-0089 (all consume this engine instead of
  asking the LLM for numbers).
- External: none at inference time. **Decision (2026-08-05): MiniLM is self-hosted.** The model is
  small (all-MiniLM-L6-v2 ≈ 22M params, ~90MB fp32 / ~23MB quantized), so it runs in-process via
  transformers.js by default, and can alternatively be served from a small internal embedding
  service behind the same `EmbeddingProvider` port with no change to callers. No third-party
  embedding API and no per-call cost either way.

## 7. Code Snippets

### AnalysisSpec — the constrained intermediate representation

```ts
// src/modules/analytics/domain/analysis-spec.ts

export type AnalysisOperation =
  | "single_post_analysis"   // one post/reel id vs account baseline
  | "top_n"                  // rank entities by a metric
  | "compare_period"         // this period vs previous
  | "anomaly_check"          // z-score / EWMA deviation flags
  | "cohort_trend"           // slope over time for a segment
  | "attribution_breakdown"  // revenue by coupon / post / channel
  | "best_time"              // day/hour engagement+revenue windows
  | "correlation"            // two-series correlation coefficient
  | "profile_quality";       // audience-quality scoring

export type MetricName =
  | "engagement" | "reach" | "impressions" | "saves" | "shares"
  | "orders" | "revenue" | "aov" | "followers" | "conversion_rate";

export interface AnalysisSpec {
  operation: AnalysisOperation;         // whitelisted — validated against the enum
  target: {
    postId?: string;
    entityType?: "post" | "product" | "coupon" | "channel" | "customer";
    entityId?: string;
    dateRange?: { from: string; to: string };
    compareTo?: { from: string; to: string };
  };
  metrics: MetricName[];
  groupBy?: "day" | "week" | "media_type" | "channel" | "coupon";
  filters?: Record<string, string | number | boolean>;
  topN?: number;
}
```

### AnalysisEngine — safe interpreter (mirrors REQ-0078 ConfigInterpreter)

```ts
// src/modules/analytics/application/analysis-engine.ts

export interface AnalysisContext {
  projectId: string;                    // hard tenant boundary — never overridable by the spec
}

export interface AnalysisResult {
  operation: AnalysisOperation;
  values: Record<string, number>;       // the hard numbers
  series?: Array<{ label: string; data: number[] }>;
  evidence: string[];                   // computed facts, e.g. "P12 vs account median (percentile)"
  confidence: "high" | "medium" | "low";
  dataQuality: "live" | "partial" | "insufficient";
}

const OPERATIONS: Record<AnalysisOperation, AnalysisOp> = {
  single_post_analysis: singlePostAnalysis,
  top_n: topN,
  compare_period: comparePeriod,
  anomaly_check: anomalyCheck,
  cohort_trend: cohortTrend,
  attribution_breakdown: attributionBreakdown,
  best_time: bestTime,
  correlation: correlation,
  profile_quality: profileQuality,
};

export function makeAnalysisEngine(deps: { fetchDataset: DatasetFetcher }) {
  return async function run(spec: AnalysisSpec, ctx: AnalysisContext): Promise<AnalysisResult> {
    const op = OPERATIONS[spec.operation];
    if (!op) throw new UnsupportedOperationError(spec.operation);   // closed vocabulary
    validateSpec(spec);                                             // params must match operation
    const dataset = await deps.fetchDataset(spec, ctx.projectId);   // scoped fetch — projectId only
    return op(dataset, spec);                                       // pure compute, no I/O, no eval
  };
}
```

### Deterministic operation — single post vs baseline (the "reel insights" case)

```ts
// src/modules/analytics/application/operations/single-post-analysis.ts

export const singlePostAnalysis: AnalysisOp = (dataset, spec) => {
  const post = dataset.target;                       // the requested post/reel
  const baseline = dataset.baseline;                 // account's other posts
  const score = engagementScore(post);
  const scores = baseline.map(engagementScore).sort((a, b) => a - b);
  const percentile = percentileRank(scores, score); // deterministic
  const z = zScore(scores, score);

  const verdict =
    percentile >= 75 ? "over" : percentile <= 25 ? "under" : "average";

  return {
    operation: "single_post_analysis",
    values: { engagementScore: score, percentile, zScore: z },
    evidence: [
      `Engagement percentile ${percentile} vs ${baseline.length} recent posts`,
      `z-score ${z.toFixed(2)} against account mean`,
      `Verdict: ${verdict}-performed`,
    ],
    confidence: baseline.length >= 8 ? "high" : baseline.length >= 3 ? "medium" : "low",
    dataQuality: baseline.length >= 3 ? "live" : "insufficient",
  };
};
```

### Narration — LLM explains, never computes

```ts
// src/modules/ai/application/narrate-analysis.ts

async function narrateAnalysis(result: AnalysisResult, ctx: NarrationContext): Promise<string> {
  // The numbers are already final. The model only writes prose around them.
  return openRouter.chat({
    model: getModelForFeature("narration", ctx.plan),
    messages: [
      { role: "system", content:
        "You explain a pre-computed analytics result to a business owner. " +
        "Use ONLY the numbers provided. Never introduce a number that is not in the payload. " +
        "Give the 'why' in 2-3 sentences, then one concrete next action." },
      { role: "user", content: JSON.stringify({ values: result.values, evidence: result.evidence }) },
    ],
  });
}
```

### OperationResolver — NL question → spec via local model (no numbers involved)

```ts
// src/modules/ai/application/operation-resolver.ts

async function resolve(question: string, deps: ResolverDeps): Promise<ResolveResult> {
  const qVec = await deps.embeddings.embed(question);               // local MiniLM
  const ranked = OPERATION_EXEMPLARS
    .map(ex => ({ op: ex.op, score: cosine(qVec, ex.vector) + bm25(question, ex.terms) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (best.score < RESOLVE_THRESHOLD) {
    return { unsupported: true, reason: "No supported analysis matches this question." };
  }
  return { spec: buildSpec(best.op, question), confidence: best.score };
}
```

## 8. Security & Reproducibility

- **No arbitrary code execution.** The AI selects an operation from a closed enum; it never writes
  or runs code. `AnalysisEngine` has no `eval` / `Function` / template-driven query construction.
- **Hard tenant boundary.** `AnalysisContext.projectId` is the only scope; the spec cannot widen it.
  Dataset fetches filter by `projectId` server-side, so one project's spec can never read another's
  data — the classic risk of a generic query engine is designed out.
- **No invented numbers.** Narration receives final numbers as immutable input; a unit test asserts
  every numeric token in the prose exists in the computed result.
- **Reproducible.** Pure operations + fixed fixtures → golden tests. MiniLM inference is
  deterministic for a pinned model version; the resolver's threshold behavior is tested.

## 9. Impact on Implemented Features (audit)

A line-by-line audit of current analytics/intelligence code was performed. Findings:

### 9a. Already deterministic — NO change needed (only re-scope to project via REQ-0090)

| File | Why it already complies |
|------|-------------------------|
| `src/modules/analytics/application/best-time-to-post.ts` | Pure bucketing + composite engagement/revenue scoring. No AI. |
| `src/modules/intelligence/application/prediction.ts` | Rule-based forecasts (churn, propensity, revenue) with explicit LOW/MEDIUM/HIGH calibration and abstention. No AI. |
| `src/modules/intelligence/application/detection.ts` | Rule-based anomaly/insight detection with evidence trails and de-dup. No AI. |
| `src/modules/analytics/application/competitor-benchmark.ts` | Pure statistics (std-dev consistency, ratios, gap analysis). No AI. |
| `src/modules/analytics/application/marketing-analytics.ts` | Deterministic attribution windowing + engagement scoring + data-quality labels. No AI. |

These become the first operations adopted into the engine's library — they are effectively
reference implementations of the target pattern.

### 9b. NEEDS modification — currently asks the LLM to produce numbers/judgment

| File | Problem | Fix (tasked below) |
|------|---------|--------------------|
| `src/modules/ai/application/analyze-media.ts` | Sends raw metrics to the LLM and lets it decide *whether* a post worked and *why*, with no deterministic baseline. The verdict is an LLM opinion, not a measured percentile. | Compute percentile/z-score verdict + evidence deterministically (`single_post_analysis`); pass only the computed result to the LLM for the storyboard/narration. → **T-085** |
| `src/modules/ai/application/generate-trends.ts` | LLM invents `predictedEngagementScore` (0–100), `predictedRevenue`, and `bestTimeToPost` — fabricated numbers presented as predictions. | Keep the LLM's *creative* idea text; source the numeric fields from the deterministic best-time + historical-baseline engines. → **T-086** |
| REQ-0085 Profile Inspector (`inspect-profile.ts`, to be built) | Spec sends raw comments to the LLM to *estimate* language/geo/quality. | Deterministic language detection + hashtag-locality lookup + quality scoring; LLM narrates and only arbitrates genuinely ambiguous cases. → **T-087** |

## 10. Open Questions

1. ~~MiniLM model choice + size.~~ **Resolved (2026-08-05):** self-host all-MiniLM-L6-v2 — small
   enough to run in-process (transformers.js) or behind a small internal embedding service via the
   `EmbeddingProvider` port. Quantized weights (~23MB) fit the worker-image budget; T-081 confirms.
2. Confidence threshold for `OperationResolver` "unsupported" cutoff — start at a conservative
   value and tune against a labelled question set.

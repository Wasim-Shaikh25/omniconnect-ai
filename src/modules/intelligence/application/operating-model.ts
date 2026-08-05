export interface Squad {
  name: string;
  owner: string;
  responsibilities: string[];
}

export interface Governance {
  executiveSponsor: string;
  productArchitect: string;
  squads: Squad[];
}

export interface Milestone {
  phase: string;
  weeks: string;
  deliverables: string[];
}

export interface Story {
  id: string;
  name: string;
  objective: string;
  ownerSquad: string;
  entities: string[];
  events: string[];
  metrics: string[];
  actions: string[];
  status: "in-discovery" | "in-build" | "pilot" | "ga";
}

export interface IntegrationHealth {
  integration: string;
  freshnessHrs: number;
  identityQuality: "good" | "fair" | "poor";
  dataGaps: string[];
}

export interface EvaluationCase {
  storyId: string;
  scenario: string;
  expectedSignals: string[];
  expectedInsight: string;
  expectedRecommendation: string;
  guardrails: string[];
}

export interface RiskTierRow {
  tier: string;
  examples: string[];
  maxAudience: number;
  maxDiscountPct: number;
  approvers: string[];
  outboundAllowed: boolean;
}

export interface SuccessCriterion {
  id: string;
  metric: string;
  target: string;
  frequency: string;
  owner: string;
}

export interface ThinSliceReview {
  dimensions: Array<{ name: string; criteria: string[] }>;
}

export interface OperatingModel {
  governance: Governance;
  milestones: Milestone[];
  stories: Story[];
  integrationHealth: IntegrationHealth[];
  evaluationCases: EvaluationCase[];
  riskMatrix: RiskTierRow[];
  thinSliceReview: ThinSliceReview;
  successCriteria: SuccessCriterion[];
}

const OPERATING_MODEL: OperatingModel = {
  governance: {
    executiveSponsor: "Chief Product Officer",
    productArchitect: "UIL Platform Lead",
    squads: [
      { name: "Intelligence Platform", owner: "Data/ML Lead", responsibilities: ["Signals", "entity resolution", "metrics", "predictions", "data quality"] },
      { name: "Decision Experience", owner: "Product Design Lead", responsibilities: ["Today feed", "insights", "recommendations", "approval UX", "feedback loops"] },
      { name: "Workflow & Execution", owner: "Engineering Lead", responsibilities: ["Action plans", "automations", "cross-module execution", "rollback controls"] },
      { name: "Domain", owner: "Domain Engineering Lead", responsibilities: ["eCommerce", "Meta", "CRM", "Campaigns", "Brand Deals", "Affiliates"] },
      { name: "Trust & Quality", owner: "Risk/Compliance Lead", responsibilities: ["Risk tiers", "AI governance", "trust language", "auditing", "privacy"] },
    ],
  },
  milestones: [
    { phase: "Week 0–2: Alignment & instrumentation", weeks: "0–2", deliverables: ["Canonical taxonomy", "Signal schema", "Metric definitions", "Risk matrix sign-off"] },
    { phase: "Week 3–6: Shared context MVP", weeks: "3–6", deliverables: ["Unified timeline", "Customer summary", "Data quality indicators", "Cross-module deep links"] },
    { phase: "Week 7–10: Explanatory intelligence", weeks: "7–10", deliverables: ["Today feed", "Anomaly detection", "Revenue/funnel decomposition", "Evidence drawer"] },
    { phase: "Week 11–14: Next Best Action & goals", weeks: "11–14", deliverables: ["Recommendation ranking", "Action plans", "Decision policy", "Goal pacing"] },
    { phase: "Week 15–20: Predictions & learning", weeks: "15–20", deliverables: ["Forecasts", "Hypotheses", "Experiments/holdouts", "Learning memory"] },
    { phase: "Week 21–30: Scale & optimization", weeks: "21–30", deliverables: ["Agency portfolio", "Competitor benchmarks", "Cost/latency optimization", "Localization"] },
  ],
  stories: [
    {
      id: "story-1",
      name: "Revenue decline diagnosis",
      objective: "Detect and explain a drop in revenue, then recommend the safest corrective action.",
      ownerSquad: "Intelligence Platform",
      entities: ["Store", "Order", "Product", "Customer", "Campaign"],
      events: ["OrderPlaced", "ProductsSynced", "MetricSnapshot", "SignalIngested"],
      metrics: ["revenue_7d", "order_count_7d", "aov_7d", "conversion_rate"],
      actions: ["GENERATE_COUPON", "CREATE_DM_CAMPAIGN", "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN"],
      status: "pilot",
    },
    {
      id: "story-2",
      name: "High-intent conversation → purchase",
      objective: "Prioritize conversations showing purchase intent and recommend the best next reply or takeover.",
      ownerSquad: "Decision Experience",
      entities: ["Conversation", "Message", "Customer", "Product"],
      events: ["NewMessage", "ConversationTakenOver", "AIResumed"],
      metrics: ["response_time", "high_intent_conversations", "conversion_rate"],
      actions: ["TAKE_OVER_CONVERSATION", "GENERATE_COUPON"],
      status: "in-build",
    },
    {
      id: "story-3",
      name: "Repeat-purchase re-engagement",
      objective: "Identify one-time buyers at risk of churning and recommend a targeted re-engagement campaign.",
      ownerSquad: "Workflow & Execution",
      entities: ["Customer", "Order", "Campaign", "DmCampaign"],
      events: ["OrderPlaced", "CustomerProfileUpdated", "DmCampaignSent"],
      metrics: ["repeat_purchase_rate", "customer_lifetime_value", "order_count_30d"],
      actions: ["CREATE_DM_CAMPAIGN", "GENERATE_COUPON"],
      status: "in-discovery",
    },
  ],
  integrationHealth: [
    { integration: "Shopify / eCommerce", freshnessHrs: 1, identityQuality: "good", dataGaps: ["Real-time inventory webhook not configured for some stores"] },
    { integration: "Meta (Facebook/Instagram)", freshnessHrs: 4, identityQuality: "fair", dataGaps: ["IG comment attribution incomplete", "Follower identity resolution pending"] },
    { integration: "CRM / Customer directory", freshnessHrs: 24, identityQuality: "good", dataGaps: ["Consent refresh not automated"] },
    { integration: "Campaigns / DmCampaigns", freshnessHrs: 12, identityQuality: "good", dataGaps: ["Send-time outcome linkage in progress"] },
    { integration: "Brand Deals / Affiliates", freshnessHrs: 72, identityQuality: "poor", dataGaps: ["No automated deliverable status sync", "Limited audience overlap data"] },
  ],
  evaluationCases: [
    { storyId: "story-1", scenario: "Store revenue drops 30% over 7 days with one out-of-stock product and inbox mentions of that product.", expectedSignals: ["OrderPlaced", "ProductsSynced", "NewMessage"], expectedInsight: "Revenue declined driven by product availability", expectedRecommendation: "Create alternative-product DM campaign", guardrails: ["Approval required", "Max audience 500", "Consent confirmed"] },
    { storyId: "story-2", scenario: "Customer asks 'Do you ship to Canada?' after viewing a product page.", expectedSignals: ["NewMessage"], expectedInsight: "High-intent conversation needs attention", expectedRecommendation: "Take over conversation with product/offer context", guardrails: ["Human-in-the-loop for shipping exceptions"] },
    { storyId: "story-3", scenario: "One-time buyer has not purchased in 90 days but opened a recent Meta DM.", expectedSignals: ["OrderPlaced", "DmCampaignSent", "CustomerProfileUpdated"], expectedInsight: "Customer at risk of churn", expectedRecommendation: "Send repeat-purchase DM campaign with 10% discount", guardrails: ["Frequency cap 7 days", "Max discount 15%"] },
  ],
  riskMatrix: [
    { tier: "TIER_0", examples: ["Internal dashboard refresh", "Read-only insight"], maxAudience: 0, maxDiscountPct: 0, approvers: ["USER"], outboundAllowed: false },
    { tier: "TIER_1", examples: ["AI response / suggestion", "Manual take-over suggestion"], maxAudience: 100, maxDiscountPct: 0, approvers: ["USER", "USER", "SUPER_ADMIN"], outboundAllowed: false },
    { tier: "TIER_2", examples: ["Single coupon generation", "Low-risk DM to opted-in segment"], maxAudience: 500, maxDiscountPct: 15, approvers: ["USER", "SUPER_ADMIN"], outboundAllowed: true },
    { tier: "TIER_3", examples: ["High-value customer campaign", "Multi-day automation"], maxAudience: 2000, maxDiscountPct: 25, approvers: ["SUPER_ADMIN"], outboundAllowed: true },
    { tier: "TIER_4", examples: ["Store-wide discount", "Autonomous outbound campaign", "Bulk data change"], maxAudience: 10000, maxDiscountPct: 50, approvers: ["SUPER_ADMIN"], outboundAllowed: true },
  ],
  thinSliceReview: {
    dimensions: [
      { name: "Accuracy", criteria: ["Insight matches seeded anomaly", "Driver explanation references out-of-stock product", "Recommendation links correct alternative product"] },
      { name: "Usefulness", criteria: ["Action preview shows audience and expected impact", "Recommended action directly addresses revenue driver", "User can edit/approve/dismiss"] },
      { name: "Safety", criteria: ["Risk tier enforcement blocks unapproved outbound actions", "Consent/frequency guardrails applied", "Rollback controls available"] },
      { name: "Latency", criteria: ["Detection completes in <30s for seeded store", "Recommendation generation <1s after insight"] },
      { name: "Architectural reuse", criteria: ["Uses canonical Signal/Event envelope", "Reuses DecisionPolicyService", "Outcome links back to BusinessInsight and ActionPlan"] },
    ],
  },
  successCriteria: [
    { id: "sc1", metric: "Weekly qualified insights", target: ">80% are relevant and evidence-backed", frequency: "Weekly", owner: "Trust & Quality" },
    { id: "sc2", metric: "Traceable evidence", target: "100% of TIER_2+ actions have linked evidence", frequency: "Per action", owner: "Intelligence Platform" },
    { id: "sc3", metric: "Initial story precision / completion", target: ">70% precision, >50% action completion for first 3 stories", frequency: "Monthly", owner: "Decision Experience" },
    { id: "sc4", metric: "Consistent identity / metrics", target: ">95% customer identity confidence, metrics reconcile across modules", frequency: "Monthly", owner: "Intelligence Platform" },
    { id: "sc5", metric: "Measurable recommendations", target: ">60% of accepted recommendations have a measured outcome", frequency: "Monthly", owner: "Workflow & Execution" },
    { id: "sc6", metric: "Healthy opt-out / dismissal rates", target: "<10% dismissals due to irrelevance", frequency: "Weekly", owner: "Trust & Quality" },
    { id: "sc7", metric: "Zero critical permission failures", target: "0 unapproved outbound actions executed", frequency: "Weekly", owner: "Trust & Quality" },
    { id: "sc8", metric: "Forecast baselines", target: "All predictions show probability bands and calibration notes", frequency: "Per prediction", owner: "Intelligence Platform" },
    { id: "sc9", metric: "Reusable story infrastructure", target: "Each new story reuses signal, metric, and action contracts", frequency: "Per story", owner: "Product Architect" },
  ],
};

export function makeOperatingModelService() {
  return {
    getGovernance(): Governance {
      return OPERATING_MODEL.governance;
    },
    getMilestones(): Milestone[] {
      return OPERATING_MODEL.milestones;
    },
    getStories(): Story[] {
      return OPERATING_MODEL.stories;
    },
    getStory(id: string): Story | null {
      return OPERATING_MODEL.stories.find((s) => s.id === id) ?? null;
    },
    getIntegrationHealth(): IntegrationHealth[] {
      return OPERATING_MODEL.integrationHealth;
    },
    getEvaluationCases(): EvaluationCase[] {
      return OPERATING_MODEL.evaluationCases;
    },
    getRiskMatrix(): RiskTierRow[] {
      return OPERATING_MODEL.riskMatrix;
    },
    getThinSliceReview(): ThinSliceReview {
      return OPERATING_MODEL.thinSliceReview;
    },
    getSuccessCriteria(): SuccessCriterion[] {
      return OPERATING_MODEL.successCriteria;
    },
    getModel(): OperatingModel {
      return OPERATING_MODEL;
    },
  };
}

export type OperatingModelService = ReturnType<typeof makeOperatingModelService>;

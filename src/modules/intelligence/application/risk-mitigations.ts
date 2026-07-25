export interface RiskMitigation {
  id: string;
  risk: string;
  mitigation: string;
  owner: string;
  status: "implemented" | "planned" | "monitoring";
}

const MITIGATIONS: RiskMitigation[] = [
  { id: "m1", risk: "Incorrect explanations", mitigation: "AI response contract with evidence, confidence, and missing-data warnings; human review for Tier 3+ actions.", owner: "Trust & Quality", status: "implemented" },
  { id: "m2", risk: "Alert fatigue", mitigation: "Prioritized Today feed, dismiss/snooze controls, deduplication, and freshness-aware suppression.", owner: "Decision Experience", status: "implemented" },
  { id: "m3", risk: "Identity errors", mitigation: "Entity resolution confidence levels (VERIFIED/PROBABLE/POSSIBLE/REJECTED), manual merge/split, and identity-confidence KPI.", owner: "Intelligence Platform", status: "implemented" },
  { id: "m4", risk: "Bad data", mitigation: "Data-quality gate, freshness SLA, quarantine queue, and stale-metric alerts before insight generation.", owner: "Intelligence Platform", status: "implemented" },
  { id: "m5", risk: "Automation harm", mitigation: "Tiered approval matrix, consent/frequency guardrails, max spend/discount caps, and rollback controls.", owner: "Trust & Quality", status: "implemented" },
  { id: "m6", risk: "Prediction overconfidence", mitigation: "Probability bands, abstention when data is insufficient, calibration tracking, and trust-language rewrite.", owner: "Intelligence Platform", status: "implemented" },
  { id: "m7", risk: "Optimization conflict", mitigation: "Workspace-level goal pacing, cross-module metric sharing, and conflict detection in automation guard.", owner: "Decision Experience", status: "planned" },
  { id: "m8", risk: "Cold start", mitigation: "Deterministic baseline rules and scenario-range fallbacks until enough historical data is available.", owner: "Intelligence Platform", status: "implemented" },
  { id: "m9", risk: "Cost / latency", mitigation: "Cached metric snapshots, model routing, async narrative generation, and cost/latency monitoring.", owner: "Intelligence Platform", status: "implemented" },
  { id: "m10", risk: "Cross-module ownership conflict", mitigation: "Domain ownership per module, public contracts, event-driven integration, and canonical signal taxonomy.", owner: "Workflow & Execution", status: "implemented" },
];

export function makeRiskMitigationRegistry() {
  return {
    list(): RiskMitigation[] {
      return MITIGATIONS;
    },
    get(id: string): RiskMitigation | null {
      return MITIGATIONS.find((m) => m.id === id) ?? null;
    },
    filterByStatus(status: RiskMitigation["status"]): RiskMitigation[] {
      return MITIGATIONS.filter((m) => m.status === status);
    },
  };
}

export type RiskMitigationRegistry = ReturnType<typeof makeRiskMitigationRegistry>;

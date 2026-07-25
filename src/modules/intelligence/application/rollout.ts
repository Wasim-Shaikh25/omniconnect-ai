export type RolloutMode = "SHADOW" | "INTERNAL" | "PILOT" | "BETA" | "GA";

export interface RolloutGate {
  name: RolloutMode;
  enabled: boolean;
  canExecuteOutboundActions: boolean;
  allowedEnvironments: string[];
  maxRiskTier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  requiresApproval: boolean;
}

export interface RollbackControl {
  id: string;
  label: string;
  active: boolean;
  description: string;
}

const DEFAULT_GATES: Record<RolloutMode, RolloutGate> = {
  SHADOW: {
    name: "SHADOW",
    enabled: true,
    canExecuteOutboundActions: false,
    allowedEnvironments: ["test"],
    maxRiskTier: "TIER_1",
    requiresApproval: true,
  },
  INTERNAL: {
    name: "INTERNAL",
    enabled: false,
    canExecuteOutboundActions: false,
    allowedEnvironments: ["test", "staging"],
    maxRiskTier: "TIER_2",
    requiresApproval: true,
  },
  PILOT: {
    name: "PILOT",
    enabled: false,
    canExecuteOutboundActions: true,
    allowedEnvironments: ["staging", "production"],
    maxRiskTier: "TIER_3",
    requiresApproval: true,
  },
  BETA: {
    name: "BETA",
    enabled: false,
    canExecuteOutboundActions: true,
    allowedEnvironments: ["production"],
    maxRiskTier: "TIER_4",
    requiresApproval: true,
  },
  GA: {
    name: "GA",
    enabled: false,
    canExecuteOutboundActions: true,
    allowedEnvironments: ["production"],
    maxRiskTier: "TIER_4",
    requiresApproval: false,
  },
};

const gates = new Map(Object.entries(DEFAULT_GATES)) as Map<RolloutMode, RolloutGate>;

const DEFAULT_ROLLBACK: RollbackControl[] = [
  { id: "disable-generator", label: "Disable insight/recommendation generator", active: false, description: "Stop new intelligence generation while preserving existing data." },
  { id: "revert-rules", label: "Revert to deterministic baseline rules", active: false, description: "Fallback to last validated rule set and model version." },
  { id: "disable-outbound", label: "Disable outbound action execution", active: false, description: "Prevent any automated message, coupon, or campaign send." },
  { id: "pause-provider", label: "Pause AI provider / model", active: false, description: "Stop LLM calls and use fallback answers only." },
  { id: "pause-workflow", label: "Pause all active workflows", active: false, description: "Halt automation workflows without deleting them." },
];

let rollbackControls = [...DEFAULT_ROLLBACK];

export function makeRolloutService() {
  return {
    getGates(): RolloutGate[] {
      return Array.from(gates.values()).sort((a, b) => a.name.localeCompare(b.name));
    },

    getGate(name: RolloutMode): RolloutGate | null {
      return gates.get(name) ?? null;
    },

    setGate(name: RolloutMode, updates: Partial<RolloutGate>): RolloutGate {
      const existing = gates.get(name) ?? DEFAULT_GATES[name];
      const updated = { ...existing, ...updates, name };
      gates.set(name, updated as RolloutGate);
      return updated as RolloutGate;
    },

    canExecute(gateName: RolloutMode, environment: string, riskTier?: string): { allowed: boolean; reason: string } {
      const gate = gates.get(gateName) ?? DEFAULT_GATES[gateName];
      if (!gate.enabled) return { allowed: false, reason: `${gateName} gate is disabled.` };
      if (!gate.allowedEnvironments.includes(environment)) {
        return { allowed: false, reason: `${gateName} does not allow environment ${environment}.` };
      }
      if (!gate.canExecuteOutboundActions) return { allowed: false, reason: `${gateName} is in shadow/internal mode; outbound actions are disabled.` };
      if (riskTier && ["TIER_1", "TIER_2", "TIER_3", "TIER_4"].indexOf(riskTier) > ["TIER_1", "TIER_2", "TIER_3", "TIER_4"].indexOf(gate.maxRiskTier)) {
        return { allowed: false, reason: `${riskTier} exceeds ${gateName} max risk tier ${gate.maxRiskTier}.` };
      }
      return { allowed: true, reason: "OK" };
    },

    getRollbackControls(): RollbackControl[] {
      return rollbackControls;
    },

    toggleRollback(id: string, active: boolean): RollbackControl[] {
      rollbackControls = rollbackControls.map((c) => (c.id === id ? { ...c, active } : c));
      return rollbackControls;
    },

    anyOutboundPaused(): boolean {
      return rollbackControls.some((c) => c.active && (c.id === "disable-outbound" || c.id === "pause-workflow"));
    },
  };
}

export type RolloutService = ReturnType<typeof makeRolloutService>;

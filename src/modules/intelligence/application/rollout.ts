import type { RolloutGateRecord, RolloutMode, RiskTier } from "../domain/types";
import type { RolloutGateRepository } from "./ports";

export type { RolloutGateRecord as RolloutGate, RolloutMode, RiskTier };

export interface RollbackControl {
  id: string;
  label: string;
  active: boolean;
  description: string;
}

const DEFAULT_ROLLBACK: RollbackControl[] = [
  { id: "disable-generator", label: "Disable insight/recommendation generator", active: false, description: "Stop new intelligence generation while preserving existing data." },
  { id: "revert-rules", label: "Revert to deterministic baseline rules", active: false, description: "Fallback to last validated rule set and model version." },
  { id: "disable-outbound", label: "Disable outbound action execution", active: false, description: "Prevent any automated message, coupon, or campaign send." },
  { id: "pause-provider", label: "Pause AI provider / model", active: false, description: "Stop LLM calls and use fallback answers only." },
  { id: "pause-workflow", label: "Pause all active workflows", active: false, description: "Halt automation workflows without deleting them." },
];

let rollbackControls = [...DEFAULT_ROLLBACK];

export interface RolloutServiceInput {
  gates: RolloutGateRepository;
}

export function makeRolloutService(input: RolloutServiceInput) {
  return {
    async getGates(userId: string): Promise<RolloutGateRecord[]> {
      return input.gates.getGates(userId);
    },

    async getGate(name: RolloutMode, userId: string): Promise<RolloutGateRecord | null> {
      return input.gates.getGate(name, userId);
    },

    async setGate(name: RolloutMode, userId: string, updates: Partial<RolloutGateRecord>): Promise<RolloutGateRecord> {
      return input.gates.setGate(name, userId, updates.enabled ?? false);
    },

    async canExecute(
      gateName: RolloutMode,
      userId: string,
      environment: string,
      riskTier?: RiskTier,
    ): Promise<{ allowed: boolean; reason: string }> {
      const gate = await input.gates.getGate(gateName, userId);
      if (!gate) return { allowed: false, reason: `${gateName} gate is not configured.` };
      if (!gate.enabled) return { allowed: false, reason: `${gateName} gate is disabled.` };
      if (!gate.allowedEnvironments.includes(environment)) {
        return { allowed: false, reason: `${gateName} does not allow environment ${environment}.` };
      }
      if (!gate.canExecuteOutboundActions) return { allowed: false, reason: `${gateName} is in shadow/internal mode; outbound actions are disabled.` };
      if (riskTier && (["TIER_1", "TIER_2", "TIER_3", "TIER_4"] as RiskTier[]).indexOf(riskTier) > (["TIER_1", "TIER_2", "TIER_3", "TIER_4"] as RiskTier[]).indexOf(gate.maxRiskTier)) {
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

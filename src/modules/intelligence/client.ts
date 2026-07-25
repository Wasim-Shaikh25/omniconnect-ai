/**
 * Client-safe intelligence barrel.
 *
 * Only re-exports server actions and type-only contracts that do not pull
 * server-only dependencies into the browser bundle.
 */

export {
  runQualityChecksAction,
  getRolloutGatesAction,
  setRolloutGateAction,
  getRiskMitigationsAction,
  getOperatingModelAction,
  getRiskMatrixAction,
} from "./presentation/actions";

export type { QualityReport, QualityCheck } from "./application/quality-assurance";
export type { RolloutGate, RolloutMode } from "./application/rollout";
export type { RiskMitigation } from "./application/risk-mitigations";
export type { OperatingModel, Story, RiskTierRow, SuccessCriterion } from "./application/operating-model";

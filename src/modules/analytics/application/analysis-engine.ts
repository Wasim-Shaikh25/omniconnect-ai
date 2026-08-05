import { validateSpec, UnsupportedOperationError, type AnalysisSpec, type AnalysisResult } from "../domain/analysis";

export interface AnalysisContext {
  projectId: string;
}

export type DatasetFetcher<T = unknown> = (spec: AnalysisSpec, projectId: string) => Promise<T>;

export type AnalysisOp<T = unknown> = (dataset: T, spec: AnalysisSpec) => AnalysisResult | Promise<AnalysisResult>;

export interface AnalysisEngineOperations {
  single_post_analysis: AnalysisOp;
  top_n: AnalysisOp;
  compare_period: AnalysisOp;
  anomaly_check: AnalysisOp;
  cohort_trend: AnalysisOp;
  attribution_breakdown: AnalysisOp;
  best_time: AnalysisOp;
  correlation: AnalysisOp;
  profile_quality: AnalysisOp;
}

export interface AnalysisEngineDeps {
  fetchDataset: DatasetFetcher;
  operations: AnalysisEngineOperations;
}

export interface AnalysisEngine {
  run(spec: AnalysisSpec, ctx: AnalysisContext): Promise<AnalysisResult>;
}

export function makeAnalysisEngine(deps: AnalysisEngineDeps): AnalysisEngine {
  return {
    async run(spec: AnalysisSpec, ctx: AnalysisContext): Promise<AnalysisResult> {
      validateSpec(spec);

      const op = deps.operations[spec.operation];
      if (!op) {
        throw new UnsupportedOperationError(spec.operation);
      }

      const dataset = await deps.fetchDataset(spec, ctx.projectId);
      return op(dataset, spec);
    },
  };
}

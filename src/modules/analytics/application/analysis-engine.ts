import { validateSpec, UnsupportedOperationError, type AnalysisSpec, type AnalysisResult, type AnalysisOperation } from "../domain/analysis";

export interface AnalysisContext {
  projectId: string;
}

export type DatasetFetcher<T = unknown> = (spec: AnalysisSpec, projectId: string) => Promise<T>;

export type AnalysisOp<T = unknown> = (dataset: T, spec: AnalysisSpec) => AnalysisResult | Promise<AnalysisResult>;

export type AnalysisEngineOperations = Partial<
  Record<AnalysisOperation, AnalysisOp>
>;

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

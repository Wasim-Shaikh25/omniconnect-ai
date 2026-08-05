import type { AnalysisEngine, AnalysisResult } from "@/modules/analytics/pure";
import type { ResolveResult } from "./operation-resolver";

export interface QueryAnalyticsDeps {
  resolveOperation(question: string): Promise<ResolveResult>;
  engine: AnalysisEngine;
}

export type QueryAnalyticsResult =
  | { result: AnalysisResult }
  | { unsupported: true; reason: string };

export async function queryAnalytics(
  deps: QueryAnalyticsDeps,
  question: string,
  projectId: string
): Promise<QueryAnalyticsResult> {
  const resolved = await deps.resolveOperation(question);

  if ("unsupported" in resolved) {
    return { unsupported: true, reason: resolved.reason };
  }

  const result = await deps.engine.run(resolved.spec, { projectId });
  return { result };
}

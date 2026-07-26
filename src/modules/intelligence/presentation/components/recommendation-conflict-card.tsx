import { AlertTriangle } from "lucide-react";
import { getRecommendationConflictsAction } from "../actions";

export async function RecommendationConflictCard({ storeId }: { storeId: string }) {
  const { conflicts } = await getRecommendationConflictsAction(storeId);
  const latest = conflicts[0];
  if (!latest) return null;

  return (
    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
        <div>
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">Conflicting recommendations</p>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Winner: {latest.winnerTitle}
          </p>
          {latest.runnerUpTitle && (
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Runner-up: {latest.runnerUpTitle}
            </p>
          )}
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            {latest.reason} (policy: {latest.appliedPolicy})
          </p>
        </div>
      </div>
    </div>
  );
}

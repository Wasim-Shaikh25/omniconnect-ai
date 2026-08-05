import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHypothesesAction, getBusinessLearningAction } from "@/modules/intelligence";
import type { HypothesisRecord, BusinessLearningRecord } from "@/modules/intelligence";

function statusClass(status: HypothesisRecord["status"]): string {
  switch (status) {
    case "VALIDATED":
      return "text-green-600";
    case "REFUTED":
      return "text-red-600";
    default:
      return "text-amber-600";
  }
}

function HypothesisRow({ hypothesis }: { hypothesis: HypothesisRecord }) {
  return (
    <li className="rounded-md border p-3 text-sm">
      <p className="font-medium">{hypothesis.statement}</p>
      <p className="text-xs text-muted-foreground">Expected: {hypothesis.expectedOutcome}</p>
      <p className={`mt-1 text-xs font-medium ${statusClass(hypothesis.status)}`}>
        {hypothesis.status.toLowerCase()}
        {hypothesis.confidence !== null && ` · ${Math.round(hypothesis.confidence * 100)}% confidence`}
      </p>
    </li>
  );
}

function LearningRow({ record }: { record: BusinessLearningRecord }) {
  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{record.ruleName}</span>
        <span className="text-xs text-muted-foreground">weight {record.weight.toFixed(2)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Successes {record.successCount} · Failures {record.failureCount}
        {record.lastOutcomeAt && ` · last outcome ${record.lastOutcomeAt.toLocaleDateString()}`}
      </p>
    </li>
  );
}

export async function LearningPanel({ projectId }: { projectId?: string }) {
  const [{ hypotheses }, { learning }] = await Promise.all([
    getHypothesesAction(projectId),
    getBusinessLearningAction(projectId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Learning</CardTitle>
        <CardDescription>Hypotheses and learned action patterns from outcomes.</CardDescription>
      </CardHeader>
      <CardContent>
        {hypotheses.length === 0 && learning.length === 0 ? (
          <p className="text-sm text-muted-foreground">No learning data yet.</p>
        ) : (
          <div className="space-y-4">
            {hypotheses.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Hypotheses</h4>
                <ul className="space-y-2">
                  {hypotheses.map((h) => (
                    <HypothesisRow key={h.id} hypothesis={h} />
                  ))}
                </ul>
              </div>
            )}
            {learning.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Learned rules</h4>
                <ul className="space-y-2">
                  {learning.map((l) => (
                    <LearningRow key={l.id} record={l} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

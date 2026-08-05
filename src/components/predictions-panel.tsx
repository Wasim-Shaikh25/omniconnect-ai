import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPredictionsAction } from "@/modules/intelligence";
import type { PredictionRecord } from "@/modules/intelligence";

function formatProbability(probability: number | null): string {
  if (probability === null) return "—";
  return `${Math.round(probability * 100)}%`;
}

function PredictionRow({ prediction }: { prediction: PredictionRecord }) {
  return (
    <li className="rounded-md border p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{prediction.predictionType.replace(/_/g, " ").toLowerCase()}</span>
        {prediction.status === "ABSTAINED" ? (
          <span className="text-xs text-muted-foreground">Abstained</span>
        ) : (
          <span className="text-xs font-medium">{formatProbability(prediction.probability)}</span>
        )}
      </div>
      <p className="mt-1 text-muted-foreground">{prediction.reason}</p>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>Estimate: {prediction.estimate}</span>
        {prediction.lowerBound !== null && prediction.upperBound !== null && (
          <span>Range: {prediction.lowerBound}–{prediction.upperBound}</span>
        )}
        <span>Horizon: {prediction.horizon}</span>
        <span>Calibration: {prediction.calibration ?? "—"}</span>
      </div>
    </li>
  );
}

export async function PredictionsPanel({ projectId }: { projectId?: string }) {
  const { predictions } = await getPredictionsAction(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Predictions</CardTitle>
        <CardDescription>Rule-based forecasts and risk scores with probability bands.</CardDescription>
      </CardHeader>
      <CardContent>
        {predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active predictions.</p>
        ) : (
          <ul className="space-y-3">
            {predictions.map((p) => (
              <PredictionRow key={p.id} prediction={p} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

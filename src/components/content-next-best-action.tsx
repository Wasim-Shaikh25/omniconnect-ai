import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContentNextBestActionAction } from "@/modules/intelligence";

export async function ContentNextBestAction({ storeId }: { storeId: string }) {
  const { action } = await getContentNextBestActionAction(storeId);
  if (!action) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Content next best action</CardTitle>
        <CardDescription>{action.timing}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.repeatFormats.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Repeat formats</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.repeatFormats.map((f) => (
                <li key={f.format} className="flex items-center justify-between">
                  <span className="capitalize">{f.format}</span>
                  <span className="text-xs text-muted-foreground">{f.evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.contentGaps.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Content gaps</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.contentGaps.map((g) => (
                <li key={g.topic}>
                  Feature {g.suggestedProductTitle ?? g.topic} in upcoming content.
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.reasons.length > 0 && (
          <p className="text-xs text-muted-foreground">{action.reasons.join(" · ")}</p>
        )}
      </CardContent>
    </Card>
  );
}

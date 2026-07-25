import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCustomerIntelligenceAction } from "@/modules/intelligence";
import type { CustomerIntelligenceSummary } from "@/modules/intelligence";

function confidenceClass(confidence: string): string {
  switch (confidence) {
    case "VERIFIED":
      return "bg-green-100 text-green-800";
    case "PROBABLE":
      return "bg-blue-100 text-blue-800";
    case "POSSIBLE":
      return "bg-amber-100 text-amber-800";
    default:
      return "border";
  }
}

export async function ConversationContext({ customerId }: { customerId: string }) {
  const { summary } = await getCustomerIntelligenceAction(customerId);
  if (!summary) return null;

  return <ContextCard summary={summary} />;
}

function ContextCard({ summary }: { summary: CustomerIntelligenceSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer context</CardTitle>
        <CardDescription>Unified summary for this conversation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{summary.displayName}</span>
          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${confidenceClass(summary.confidence)}`}>
            {summary.confidence.toLowerCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Lifecycle</p>
            <p className="font-medium">{summary.lifecycleStage.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Consent</p>
            <p className="font-medium">{summary.consent.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Segment</p>
            <p className="font-medium">{summary.segment}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lead score</p>
            <p className="font-medium">{summary.leadScore}/100</p>
          </div>
        </div>
        {summary.bestNextAction && (
          <p className="rounded-md bg-primary/10 p-2 text-sm">
            <span className="font-medium">Suggested:</span> {summary.bestNextAction}
          </p>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/customers/${summary.customerId}`}>View full profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

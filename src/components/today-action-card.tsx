import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ObjectiveBadge } from "@/components/objective-badge";
import { ConfidenceMeter } from "@/components/confidence-meter";
import { completeDailyActionAction, skipDailyActionAction } from "@/modules/intelligence";
import type { DailyActionRecord } from "@/modules/intelligence";

export function TodayActionCard({ action }: { action: DailyActionRecord }) {
  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ObjectiveBadge objective={action.objective} />
            <ConfidenceMeter confidence={action.confidence} />
          </div>
          <h4 className="mt-2 text-sm font-semibold">{action.title}</h4>
          <p className="mt-0.5 text-sm text-muted-foreground">{action.description}</p>
          {action.suggestedAction && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Suggested:</span> {action.suggestedAction}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {action.deepLink && (
            <Button asChild variant="outline" size="sm">
              <Link href={action.deepLink}>Open</Link>
            </Button>
          )}
          <form action={completeDailyActionAction}>
            <input type="hidden" name="actionId" value={action.id} />
            <Button type="submit" variant="default" size="sm" className="w-full">
              Mark done
            </Button>
          </form>
          <form action={skipDailyActionAction}>
            <input type="hidden" name="actionId" value={action.id} />
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Skip
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}

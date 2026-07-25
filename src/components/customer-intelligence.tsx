import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCustomerTimelineAction,
  getCustomerIntelligenceAction,
  mergeEntityAction,
  splitEntityAction,
} from "@/modules/intelligence";
import type { TimelineEvent, EntityLinkRecord } from "@/modules/intelligence";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function confidenceClass(confidence: string | null): string {
  switch (confidence) {
    case "VERIFIED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "PROBABLE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "POSSIBLE":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    default:
      return "border";
  }
}

function stageClass(stage: string | null): string {
  if (!stage) return "border text-muted-foreground";
  return "bg-primary/10 text-primary";
}

function LinkRow({ link }: { link: EntityLinkRecord }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {link.sourceType}:{link.sourceId.slice(0, 8)} → {link.targetType}:{link.targetId.slice(0, 8)}
        </p>
        <p className="text-xs text-muted-foreground">
          {link.linkType} · {link.resolutionMethod ?? "auto"} · {link.status.toLowerCase()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${confidenceClass(link.confidence)}`}
        >
          {link.confidence.toLowerCase()}
        </span>
        {link.confidence !== "VERIFIED" && link.status !== "REVOKED" && (
          <form action={mergeEntityAction}>
            <input type="hidden" name="linkId" value={link.id} />
            <Button type="submit" variant="outline" size="sm">
              Merge
            </Button>
          </form>
        )}
        {link.status !== "REVOKED" && (
          <form action={splitEntityAction}>
            <input type="hidden" name="linkId" value={link.id} />
            <Button type="submit" variant="ghost" size="sm">
              Split
            </Button>
          </form>
        )}
      </div>
    </li>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  return (
    <li className="relative border-l-2 pl-4">
      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stageClass(event.stage)}`}>
            {event.stage ?? "Event"}
          </span>
          <span className="text-xs text-muted-foreground">{event.source}</span>
        </div>
        <p className="mt-1 text-sm font-medium">{event.title}</p>
        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
        {event.deepLink && (
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
            <Link href={event.deepLink}>Open</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

export async function CustomerIntelligence({ customerId }: { customerId: string }) {
  const [{ summary }, { events }] = await Promise.all([
    getCustomerIntelligenceAction(customerId),
    getCustomerTimelineAction(customerId),
  ]);

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Intelligence summary</CardTitle>
          <CardDescription>Unified context, next best action, and risks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Segment</p>
              <p className="font-medium">{summary.segment}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${confidenceClass(summary.confidence)}`}>
                {summary.confidence.toLowerCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preferred channel</p>
              <p className="font-medium">{summary.preferredChannel ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last active</p>
              <p className="font-medium">{formatDate(summary.lastActivityAt)}</p>
            </div>
          </div>

          {summary.bestNextAction && (
            <div className="mt-4 rounded-md bg-primary/10 p-3 text-sm">
              <span className="font-medium">Suggested next step:</span> {summary.bestNextAction}
            </div>
          )}

          {summary.risks.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-destructive">Risks</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {summary.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.opportunities.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-primary">Opportunities</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {summary.opportunities.map((op) => (
                  <li key={op}>{op}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked entities</CardTitle>
          <CardDescription>Identity graph with confidence and manual merge/split.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked entities yet.</p>
          ) : (
            <ul className="divide-y">
              {summary.links.map((link) => (
                <LinkRow key={link.id} link={link} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Confidence is derived from source match quality. Use the timeline below to review evidence.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unified timeline</CardTitle>
          <CardDescription>Customer journey from discovery to advocacy.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            <ul className="space-y-1">
              {events.map((event) => (
                <TimelineEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

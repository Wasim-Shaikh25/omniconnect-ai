import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { listMentionsWithSentimentAction } from "@/modules/social";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { SyncMentionsButton } from "./_components/sync-mentions-button";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

function sentimentVariant(sentiment: string): BadgeVariant {
  switch (sentiment) {
    case "POSITIVE":
      return "default";
    case "NEGATIVE":
      return "destructive";
    case "MIXED":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function BrandMentionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }

  const { mentions, error } = await listMentionsWithSentimentAction(projectId);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Brand Mentions"
          description="Track @mentions, tags, and hashtags with AI sentiment"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Mentions" },
          ]}
          actions={<SyncMentionsButton projectId={projectId} />}
        />

        {error && (
          <div className="section">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          </div>
        )}

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Mentions Feed</CardTitle>
            </CardHeader>
        <CardContent>
          {mentions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mentions found. Click &quot;Sync Mentions&quot; to collect the latest brand mentions.
            </p>
          ) : (
            <ul className="divide-y">
              {mentions.map((mention) => (
                <li key={mention.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        @{mention.handle ?? "unknown"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mention.caption ?? "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Source: {mention.source}</span>
                        {mention.hashtags.length > 0 && (
                          <span>Hashtags: {mention.hashtags.join(", ")}</span>
                        )}
                        {mention.mediaUrl && (
                          <a
                            href={mention.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View media
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={sentimentVariant(mention.sentiment)}>
                        {mention.sentiment}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(mention.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {mention.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

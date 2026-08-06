import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import { ContentNextBestAction } from "@/components/content-next-best-action";
import { ContentStudioForms } from "@/components/content-studio-forms";
import { PublishPostForm } from "@/components/publish-post-form";
import { HashtagIntelligence } from "@/components/hashtag-intelligence";
import { ContentBestTime } from "@/components/content-best-time";
import { ContentCalendar } from "@/components/content-calendar";
import {
  publishMediaAction,
  schedulePostAction,
} from "@/modules/content";
import { listScheduledPosts } from "@/modules/content/server";
import { getContentCalendarForStore } from "@/modules/analytics/server";
import { formatInTimeZone } from "@/shared/utils/timezone";

export default async function ContentStudioPage({
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
  const { store } = access;

  const products = await ecommerceQueries.listProducts(projectId, 100);
  const scheduled = await listScheduledPosts(projectId);
  const calendar = await getContentCalendarForStore(projectId, products).catch(() => []);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Studio</h1>
          <p className="text-sm text-muted-foreground">
            Generate AI post ideas and captions for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}`}>Back to store</Link>
        </Button>
      </header>

      <section className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Publish to Instagram</h2>
        <PublishPostForm action={publishMediaAction} projectId={projectId} mode="publish" />
      </section>

      <section className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Schedule to Instagram</h2>
        <PublishPostForm
          action={schedulePostAction}
          projectId={projectId}
          mode="schedule"
          submitLabel="Schedule"
        />
      </section>

      {scheduled.length > 0 && (
        <section className="mb-8 rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Scheduled posts</h2>
          <ul className="space-y-3">
            {scheduled.map((post) => (
              <li key={post.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{post.mediaType}</p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const { formatted, zone } = formatInTimeZone(
                        post.scheduledAt,
                        post.scheduledAtTimezone,
                      );
                      return `${formatted} (${zone}) · ${post.status}`;
                    })()}
                  </p>
                </div>
                {post.externalId && (
                  <span className="text-sm text-green-600">Published {post.externalId}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <HashtagIntelligence projectId={projectId} />

      <ContentBestTime projectId={projectId} />

      <ContentCalendar
        projectId={projectId}
        slots={calendar.map((s) => ({
          date: s.date.toISOString().slice(0, 10),
          hour: s.hour,
          dayOfWeek: s.dayOfWeek,
          format: s.format,
          suggestedCaption: s.suggestedCaption,
          suggestedHashtags: s.suggestedHashtags,
          productNames: s.productNames,
          reason: s.reason,
        }))}
        scheduled={scheduled.map((post) => ({
          id: post.id,
          mediaType: post.mediaType,
          caption: post.caption,
          status: post.status,
          scheduledAt: post.scheduledAt.toISOString(),
          scheduledAtTimezone: post.scheduledAtTimezone,
        }))}
      />

      <ContentNextBestAction projectId={projectId} />

      <ContentStudioForms
        projectId={projectId}
        products={products.map((p) => ({ id: p.id, title: p.title }))}
      />
    </main>
  );
}

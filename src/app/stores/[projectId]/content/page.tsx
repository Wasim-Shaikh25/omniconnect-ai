import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentNextBestAction } from "@/components/content-next-best-action";
import { ContentStudioForms } from "@/components/content-studio-forms";
import { PublishPostForm } from "@/components/publish-post-form";
import { HashtagIntelligence } from "@/components/hashtag-intelligence";
import { ContentBestTime } from "@/components/content-best-time";
import { ContentCalendar } from "@/components/content-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Content Studio"
          description={`Generate AI post ideas and captions for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Content" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Publish to Instagram</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishPostForm action={publishMediaAction} projectId={projectId} mode="publish" />
            </CardContent>
          </Card>
        </div>

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Schedule to Instagram</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishPostForm
                action={schedulePostAction}
                projectId={projectId}
                mode="schedule"
                submitLabel="Schedule"
              />
            </CardContent>
          </Card>
        </div>

        {scheduled.length > 0 && (
          <div className="section">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled posts</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        )}

        <div className="section">
          <HashtagIntelligence projectId={projectId} />
        </div>

        <div className="section">
          <ContentBestTime projectId={projectId} />
        </div>

        <div className="section">
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
        </div>

        <div className="section">
          <ContentNextBestAction projectId={projectId} />
        </div>

        <div className="section">
          <ContentStudioForms
            projectId={projectId}
            products={products.map((p) => ({ id: p.id, title: p.title }))}
          />
        </div>
      </div>
    </div>
  );
}

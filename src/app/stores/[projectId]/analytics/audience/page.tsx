import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AudienceAnalyticsPage({
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
  const { user, store } = access;
  if (!user.userId) notFound();

  const view = await getMarketingPerformance({ userId: user.userId, projectId });

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Audience"
          description={`Who is growing, buying, and talking for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Audience" },
          ]}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/audience/inspector`}>Profile inspector</Link>
            </Button>
          }
        />

        <div className="section grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {view.audience.segments.map((segment) => (
            <Card key={segment.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{segment.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{segment.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="section grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Why it looks like this</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{view.audience.why}</p>
              <p className="mt-2 text-sm font-medium">{view.audience.nextRecommendation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New followers this week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{view.audience.newFollowersThisWeek}</p>
              <p className="text-sm text-muted-foreground">Total followers: {view.audience.followers}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
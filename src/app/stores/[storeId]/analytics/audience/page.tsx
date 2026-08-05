import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AudienceAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const access = await checkStoreAccess(storeId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.organizationId) notFound();

  const view = await getMarketingPerformance({ organizationId: user.organizationId, storeId });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audience</h1>
          <p className="text-sm text-muted-foreground">Who is growing, buying, and talking for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/analytics`}>Back to analytics</Link>
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 md:grid-cols-2">
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
    </main>
  );
}
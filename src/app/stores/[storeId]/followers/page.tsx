import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { crmQueries } from "@/modules/crm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function StoreFollowersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const followers = await crmQueries.listFollowers(storeId, 50);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Followers</h1>
          <p className="text-sm text-muted-foreground">
            {followers.length} follower(s) for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      {followers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No followers yet. Simulate a follow event from the store page.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/stores/${storeId}`}>Simulate follow</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {followers.map((follower) => (
            <Card key={follower.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {follower.username ?? "Unknown user"}
                </CardTitle>
                <CardDescription>IG: {follower.igUserId ?? "—"}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  <span className="text-muted-foreground">Followed</span>{" "}
                  <span className="font-medium">
                    {formatDate(follower.followedAt)}
                  </span>
                </p>
                {follower.campaignEnrolledAt && (
                  <p>
                    <span className="text-muted-foreground">Enrolled</span>{" "}
                    <span className="font-medium">
                      {formatDate(follower.campaignEnrolledAt)}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

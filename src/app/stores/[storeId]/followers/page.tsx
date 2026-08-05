import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/organizations";
import { crmQueries } from "@/modules/crm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaginationControls, ListSearch } from "@/components/pagination-controls";
import type { PaginationInput } from "@/shared/kernel";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "12", 10) || 12));
  return { page, limit };
}

export default async function StoreFollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
  const { projectId } = await params;
  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { store } = access;
  const paramsResolved = (await searchParams) ?? {};
  const pagination = parsePagination(paramsResolved.page, paramsResolved.limit);
  const search = paramsResolved.q?.trim();

  const { items: followers, total, totalPages } = await crmQueries.listFollowersPaginated(
    projectId,
    pagination,
    search,
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Followers</h1>
          <p className="text-sm text-muted-foreground">
            {total} follower(s) for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}`}>Back to store</Link>
        </Button>
      </header>

      <div className="mb-4">
        <ListSearch placeholder="Search by username..." defaultValue={search} limit={pagination.limit} />
      </div>

      {followers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No followers yet. Simulate a follow event from the store page.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/stores/${projectId}`}>Simulate follow</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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
          <div className="mt-6">
            <PaginationControls
              page={pagination.page}
              totalPages={totalPages}
              total={total}
              search={search}
              limit={pagination.limit}
            />
          </div>
        </>
      )}
    </main>
  );
}

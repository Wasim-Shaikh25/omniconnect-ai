import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/workspaces";
import { crmQueries } from "@/modules/crm";
import { PageHeader } from "@/components/page-header";
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
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Followers"
          description={`${total} follower(s) for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Followers" },
          ]}
        />

        <div className="section">
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
        </div>
      </div>
    </div>
  );
}

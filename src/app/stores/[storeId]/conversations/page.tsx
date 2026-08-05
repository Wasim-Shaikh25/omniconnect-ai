
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkStoreAccess } from "@/modules/organizations";
import { conversationQueries } from "@/modules/conversations";
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

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "10", 10) || 10));
  return { page, limit };
}

export default async function ConversationsPage({
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

  const { items: conversations, total, totalPages } = await conversationQueries.listConversationsPaginated(
    projectId,
    pagination,
    search,
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}`}>Back to store</Link>
        </Button>
      </header>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent conversations</CardTitle>
          <CardDescription>
            {total} conversation(s). Click to view messages and
            manage AI/human status.
          </CardDescription>
          <div className="pt-2">
            <ListSearch placeholder="Search by external ID..." defaultValue={search} limit={pagination.limit} />
          </div>
        </CardHeader>
        <CardContent>
          {conversations.length > 0 ? (
            <>
              <ul className="divide-y">
                {conversations.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{c.channel}</span>
                      <span className="ml-2 text-muted-foreground">
                        {c.externalId ?? "—"}
                      </span>
                      <span
                        className={`ml-2 inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          c.status === "HUMAN_ACTIVE"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/stores/${projectId}/conversations/${c.id}`}>
                        View
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
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
          ) : (
            <p className="text-sm text-muted-foreground">
              No conversations yet. Simulate an inbound Meta event on the store
              page to create one.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

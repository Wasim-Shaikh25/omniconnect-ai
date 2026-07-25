import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { conversationQueries } from "@/modules/conversations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConversationsPage({
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

  const conversations = await conversationQueries.listConversations(storeId, 50);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent conversations</CardTitle>
          <CardDescription>
            {conversations.length} conversation(s). Click to view messages and
            manage AI/human status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length > 0 ? (
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
                    <Link href={`/stores/${storeId}/conversations/${c.id}`}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
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

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { conversationQueries } from "@/modules/conversations";
import {
  takeOverConversationAction,
  resumeAIConversationAction,
} from "@/modules/conversations";
import { ConversationTakeoverButton } from "@/components/conversation-takeover-button";
import { ConversationContext } from "@/components/conversation-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ storeId: string; conversationId: string }>;
}) {
  const { storeId, conversationId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const detail = await conversationQueries.getConversation(conversationId);
  if (!detail || detail.conversation.storeId !== storeId) notFound();

  const isHuman = detail.conversation.status === "HUMAN_ACTIVE";

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.conversation.channel} · {detail.conversation.externalId ?? "—"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/conversations`}>
            Back to conversations
          </Link>
        </Button>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>
              Current mode for this conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`inline-flex rounded px-2 py-1 text-sm font-medium ${
                isHuman
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {detail.conversation.status}
            </div>
            {detail.conversation.assignedHumanId && (
              <p className="text-sm text-muted-foreground">
                Assigned human: {detail.conversation.assignedHumanId}
              </p>
            )}
            <ConversationTakeoverButton
              action={
                isHuman ? resumeAIConversationAction : takeOverConversationAction
              }
              storeId={storeId}
              conversationId={conversationId}
              isHuman={isHuman}
            />
          </CardContent>
        </Card>

        {detail.conversation.customerId && (
          <ConversationContext customerId={detail.conversation.customerId} />
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>
              {detail.messages.length} message(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detail.messages.length > 0 ? (
              <ul className="space-y-3">
                {detail.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`flex flex-col rounded p-3 text-sm ${
                      m.sender === "CUSTOMER"
                        ? "bg-muted"
                        : m.sender === "AI"
                          ? "bg-primary/10"
                          : "bg-amber-50"
                    }`}
                  >
                    <span className="font-medium">{m.sender}</span>
                    <span className="text-muted-foreground">{m.content}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No messages yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

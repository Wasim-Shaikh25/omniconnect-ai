import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkStoreAccess } from "@/modules/workspaces";
import { conversationQueries } from "@/modules/conversations";
import {
  takeOverConversationAction,
  resumeAIConversationAction,
  sendConversationMessageAction,
} from "@/modules/conversations";
import { ConversationTakeoverButton } from "@/components/conversation-takeover-button";
import { ConversationMessageForm } from "@/components/conversation-message-form";
import { ConversationContext, ConversationNextBestAction } from "@/components/conversation-context";
import { OnlineStatus } from "@/components/online-status";
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
  params: Promise<{ projectId: string; conversationId: string }>;
}) {
  const { projectId, conversationId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { store } = access;

  const detail = await conversationQueries.getConversation(conversationId);
  if (!detail || detail.conversation.projectId !== projectId) notFound();

  const isHuman = detail.conversation.status === "HUMAN_ACTIVE";

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <OnlineStatus />
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.conversation.channel} · {detail.conversation.externalId ?? "—"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href={`/stores/${projectId}/conversations`}>
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
              projectId={projectId}
              conversationId={conversationId}
              isHuman={isHuman}
            />
          </CardContent>
        </Card>

        {detail.conversation.customerId && (
          <ConversationContext customerId={detail.conversation.customerId} />
        )}

        <ConversationNextBestAction conversationId={conversationId} />

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
                        ? "mr-auto max-w-[85%] bg-muted sm:max-w-[75%]"
                        : m.sender === "AI"
                          ? "ml-auto max-w-[85%] bg-primary/10 text-right sm:max-w-[75%]"
                          : "ml-auto max-w-[85%] bg-amber-50 text-right sm:max-w-[75%]"
                    }`}
                  >
                    <span className="font-medium">{m.sender}</span>
                    <span className="break-words">{m.content}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No messages yet.
              </p>
            )}
            {isHuman && (
              <div className="mt-6 border-t pt-4">
                <ConversationMessageForm
                  action={sendConversationMessageAction}
                  projectId={projectId}
                  conversationId={conversationId}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
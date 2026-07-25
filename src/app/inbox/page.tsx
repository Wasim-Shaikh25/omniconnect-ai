import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  getUnifiedInboxAction,
  resumeAIConversationAction,
  takeOverConversationAction,
  type ConversationChannel,
} from "@/modules/conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationTakeoverButton } from "@/components/conversation-takeover-button";

const CHANNELS: { value: ConversationChannel; label: string }[] = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
];

const STATUSES = [
  { value: "AI_ACTIVE", label: "AI active" },
  { value: "HUMAN_ACTIVE", label: "Human active" },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{
    channel?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) redirect("/login");

  const params = (await searchParams) ?? {};
  const channel = params.channel as ConversationChannel | undefined;
  const status = params.status;
  const search = params.search;

  const filter = {
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  };

  const { items } = await getUnifiedInboxAction(
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Unified Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Triage customer conversations across all your stores.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2">
              <label
                htmlFor="channel"
                className="text-xs font-medium text-muted-foreground"
              >
                Channel
              </label>
              <select
                id="channel"
                name="channel"
                defaultValue={channel ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All channels</option>
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="status"
                className="text-xs font-medium text-muted-foreground"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="search"
                className="text-xs font-medium text-muted-foreground"
              >
                Search
              </label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder="Participant or message"
                />
                <Button type="submit" variant="secondary">
                  Filter
                </Button>
                <Button asChild variant="outline">
                  <Link href="/inbox">Reset</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No conversations match your filters.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/stores">Create or open a store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.conversationId}
              className={item.unread ? "border-primary" : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {getInitials(item.participantName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">
                        {item.participantName ?? "Unknown"}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                          {item.channel}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            item.status === "HUMAN_ACTIVE"
                              ? "bg-primary text-primary-foreground"
                              : "border"
                          }`}
                        >
                          {item.status === "AI_ACTIVE" ? "AI active" : "Human active"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(item.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.storeName}
                    </p>
                    <p className="mt-1 truncate text-sm">
                      {item.lastMessage ? (
                        <>
                          <span className="font-medium">
                            {item.lastMessage.sender}:
                          </span>{" "}
                          {item.lastMessage.content}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/stores/${item.storeId}/conversations/${item.conversationId}`}
                      >
                        View
                      </Link>
                    </Button>
                    <ConversationTakeoverButton
                      action={
                        item.status === "HUMAN_ACTIVE"
                          ? resumeAIConversationAction
                          : takeOverConversationAction
                      }
                      storeId={item.storeId}
                      conversationId={item.conversationId}
                      isHuman={item.status === "HUMAN_ACTIVE"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

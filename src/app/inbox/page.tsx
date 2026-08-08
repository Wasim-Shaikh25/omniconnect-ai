import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  getUnifiedInboxAction,
  resumeAIConversationAction,
  takeOverConversationAction,
  type ConversationChannel,
} from "@/modules/conversations";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationTakeoverButton } from "@/components/conversation-takeover-button";
import { PaginationControls, ListSearch } from "@/components/pagination-controls";
import type { PaginationInput } from "@/shared/kernel";
import { MessageCircle } from "lucide-react";

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

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "10", 10) || 10));
  return { page, limit };
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    limit?: string;
    channel?: string;
    status?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.userId) redirect("/login");

  const params = (await searchParams) ?? {};
  const pagination = parsePagination(params.page, params.limit);
  const search = params.q?.trim();
  const channel = params.channel as ConversationChannel | undefined;
  const status = params.status;

  const filter = {
    ...(search ? { search } : {}),
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
  };

  const { items, total, totalPages } = await getUnifiedInboxAction(
    Object.keys(filter).length > 0 ? filter : undefined,
    pagination,
  );

  return (
    <div className="page-container">
      <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Unified Inbox"
          description="Triage customer conversations across all your stores"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Inbox" },
          ]}
        />

        <div className="section">
        <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input type="hidden" name="q" value={search ?? ""} />
            <input type="hidden" name="limit" value={pagination.limit} />
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
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              <Button asChild variant="outline">
                <Link href="/inbox">Reset</Link>
              </Button>
            </div>
          </form>
          <div className="mt-4">
            <ListSearch placeholder="Search participant or message..." defaultValue={search} limit={pagination.limit} />
          </div>
        </CardContent>
      </Card>
        </div>

        <div className="section">
        {items.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="No conversations match your filters. Create or connect a store to see conversations."
            action={{
              label: "Create or open a store",
              onClick: () => window.location.href = "/stores",
            }}
          />
        ) : (
          <div className="space-y-6">
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
                          href={`/stores/${item.projectId}/conversations/${item.conversationId}`}
                        >
                          View
                        </Link>
                      </Button>
                      {item.customerId && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/customers/${item.customerId}`}>Profile</Link>
                        </Button>
                      )}
                      <ConversationTakeoverButton
                        action={
                          item.status === "HUMAN_ACTIVE"
                            ? resumeAIConversationAction
                            : takeOverConversationAction
                        }
                        projectId={item.projectId}
                        conversationId={item.conversationId}
                        isHuman={item.status === "HUMAN_ACTIVE"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <PaginationControls
            page={pagination.page}
            totalPages={totalPages}
            total={total}
            search={search}
            limit={pagination.limit}
          />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { use, useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listSocialCommentsAction,
  replyToCommentAction,
  toggleCommentHiddenAction,
} from "@/modules/social";

export default function CommentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = use(params).projectId;
  const [data, setData] = useState<Awaited<ReturnType<typeof listSocialCommentsAction>>>({ comments: [], mentions: [] });
  const [replyState, replyAction, replyPending] = useActionState(replyToCommentAction, { ok: false });
  const [hideState, hideAction, hidePending] = useActionState(toggleCommentHiddenAction, { ok: false });

  useEffect(() => {
    listSocialCommentsAction(projectId).then(setData);
  }, [projectId, replyState, hideState]);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Comments & Mentions"
          description="Engagement automation queue for this store"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: "Comments & Mentions" },
          ]}
        />

        <div className="section">
          <Card>
        <CardHeader>
          <CardTitle>Comments ({data.comments.length})</CardTitle>
          <CardDescription>Incoming comments are classified and can be auto-replied or hidden.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet. Simulate a comment event from the store page.</p>
          ) : (
            <ul className="divide-y">
              {data.comments.map((c) => (
                <li key={c.id} className={`py-4 text-sm ${c.hidden ? "opacity-50" : ""}`}>
                  <p className="font-medium">{c.username ?? c.externalUserId ?? "Unknown"} · {c.intent} · {c.sentiment}</p>
                  <p className="text-muted-foreground">{c.text}</p>
                  {c.autoReplyText && !c.repliedAt && <p className="mt-1 text-xs text-muted-foreground">Suggested reply: {c.autoReplyText}</p>}
                  {c.repliedAt && <p className="mt-1 text-xs text-green-600">Replied: {c.autoReplyText}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <form action={replyAction} className="flex gap-2">
                      <input type="hidden" name="commentId" value={c.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <Input name="replyText" placeholder="Reply..." className="w-64" required />
                      <Button type="submit" size="sm" disabled={replyPending}>Reply</Button>
                    </form>
                    <form action={hideAction}>
                      <input type="hidden" name="commentId" value={c.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="hidden" value={c.hidden ? "false" : "true"} />
                      <Button type="submit" variant="outline" size="sm" disabled={hidePending}>{c.hidden ? "Unhide" : "Hide"}</Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {replyState.error && <p className="text-sm text-destructive mt-2">{replyState.error}</p>}
          {replyState.ok && <p className="text-sm text-green-600 mt-2">Reply sent</p>}
          {hideState.error && <p className="text-sm text-destructive mt-2">{hideState.error}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Mentions ({data.mentions.length})</CardTitle>
              <CardDescription>Brand @mentions and tags will appear here when collected.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.mentions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mentions collected yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.mentions.map((m) => (
                    <li key={m.id} className="py-2 text-sm">
                      <p className="font-medium">{m.handle ?? m.externalUserId ?? "Unknown"} · {m.source}</p>
                      <p className="text-muted-foreground">{m.caption ?? "—"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

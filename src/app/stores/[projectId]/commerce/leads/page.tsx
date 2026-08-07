"use client";

import { use, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listLeadsAction,
  captureLeadAction,
  scoreLeadAction,
} from "@/modules/social";

function formatPayload(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return String(payload ?? "—");
  const p = payload as Record<string, string | undefined>;
  const parts: string[] = [];
  if (p.name) parts.push(`Name: ${p.name}`);
  if (p.email) parts.push(`Email: ${p.email}`);
  if (p.note) parts.push(`Note: ${p.note}`);
  if (p.text) parts.push(`Message: ${p.text}`);
  if (p.username) parts.push(`From @${p.username}`);
  if (p.channel) parts.push(`Channel: ${p.channel}`);
  if (p.intent) parts.push(`Intent: ${p.intent}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default function LeadsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = use(params).projectId;
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof listLeadsAction>>>([]);
  const [captureState, captureAction, capturePending] = useActionState(captureLeadAction, { ok: false });
  const [scoreState, scoreAction, scorePending] = useActionState(scoreLeadAction, { ok: false });

  useEffect(() => {
    listLeadsAction(projectId).then(setLeads);
  }, [projectId, captureState, scoreState]);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Leads"
          description="Capture and score leads from ads, DMs, comments, and follows"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: "Leads" },
          ]}
        />

        <div className="section">
          <Card>
        <CardHeader>
          <CardTitle>Capture lead</CardTitle>
          <CardDescription>Simulate a Meta Lead Ads submission or manual entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={captureAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="projectId" value={projectId} />
            <div>
              <label className="text-sm font-medium">Source</label>
              <select name="source" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                <option value="LEAD_ADS">Lead Ad</option>
                <option value="DM">DM</option>
                <option value="COMMENT">Comment</option>
                <option value="FOLLOW">Follow</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input name="name" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Input name="note" placeholder="Interested in bulk pricing" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={capturePending}>{capturePending ? "Saving…" : "Capture lead"}</Button>
              {captureState.error && <p className="text-sm text-destructive ml-2 inline">{captureState.error}</p>}
              {captureState.ok && <p className="text-sm text-green-600 ml-2 inline">Lead captured</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead list ({leads.length})</CardTitle>
          <CardDescription>Leads are auto-scored based on source and intent signals.</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet. Capture one above or simulate a DM/follow/comment from the store page.</p>
          ) : (
            <ul className="divide-y">
              {leads.map((l) => (
                <li key={l.id} className="py-3 text-sm flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{l.source} · score {l.score} · {l.status}</p>
                    <p className="text-muted-foreground">{formatPayload(l.payload)}</p>
                    <p className="text-xs text-muted-foreground">{l.createdAt.toLocaleString()}</p>
                  </div>
                  <form action={scoreAction}>
                    <input type="hidden" name="leadId" value={l.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <Button type="submit" variant="outline" size="sm" disabled={scorePending}>Re-score</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {scoreState.error && <p className="text-sm text-destructive mt-2">{scoreState.error}</p>}
          {scoreState.ok && <p className="text-sm text-green-600 mt-2">Scores updated</p>}
        </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

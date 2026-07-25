"use client";

import { use, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listLeadsAction,
  captureLeadAction,
  scoreLeadAction,
} from "@/modules/social";

export default function LeadsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const storeId = use(params).storeId;
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof listLeadsAction>>>([]);
  const [captureState, captureAction, capturePending] = useActionState(captureLeadAction, { ok: false });
  const [scoreState, scoreAction, scorePending] = useActionState(scoreLeadAction, { ok: false });

  useEffect(() => {
    listLeadsAction(storeId).then(setLeads);
  }, [storeId, captureState, scoreState]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">Capture and score leads from ads, DMs, comments, and follows.</p>
        <Link href={`/stores/${storeId}`} className="text-sm text-muted-foreground underline">Back to store</Link>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Capture lead</CardTitle>
          <CardDescription>Simulate a Meta Lead Ads submission or manual entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={captureAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="storeId" value={storeId} />
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
                    <p className="text-muted-foreground">{JSON.stringify(l.payload)}</p>
                    <p className="text-xs text-muted-foreground">{l.createdAt.toLocaleString()}</p>
                  </div>
                  <form action={scoreAction}>
                    <input type="hidden" name="leadId" value={l.id} />
                    <input type="hidden" name="storeId" value={storeId} />
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
    </main>
  );
}

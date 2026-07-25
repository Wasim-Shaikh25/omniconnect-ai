"use client";

import { use, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createShoppableMediaAction,
  syncMetaCatalogAction,
  listCommerceCatalogAction,
} from "@/modules/commerce";

export default function CommerceCatalogPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  return <CatalogPage params={params} />;
}

function CatalogPage({ params }: { params: Promise<{ storeId: string }> }) {
  const storeId = use(params).storeId;
  const [data, setData] = useState<Awaited<ReturnType<typeof listCommerceCatalogAction>> | null>(null);
  const [syncState, syncAction, syncPending] = useActionState(syncMetaCatalogAction, { ok: false });
  const [mediaState, mediaAction, mediaPending] = useActionState(createShoppableMediaAction, { ok: false });

  useEffect(() => {
    listCommerceCatalogAction(storeId).then(setData);
  }, [storeId, syncState, mediaState]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Commerce catalog</h1>
        <p className="text-sm text-muted-foreground">Sync Shopify products to Instagram Shop and tag them in shoppable media.</p>
        <Link href={`/stores/${storeId}`} className="text-sm text-muted-foreground underline">Back to store</Link>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Meta catalog sync</CardTitle>
          <CardDescription>Push the latest product catalog to Meta Commerce.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Status: {data?.sync?.status ?? "never synced"} {data?.sync?.lastSyncedAt ? ` · ${data.sync.lastSyncedAt.toLocaleString()}` : ""}
          </p>
          <form action={syncAction} className="flex items-center gap-4">
            <input type="hidden" name="storeId" value={storeId} />
            <Button type="submit" disabled={syncPending}>{syncPending ? "Syncing…" : "Sync catalog"}</Button>
            {syncState.error && <p className="text-sm text-destructive">{syncState.error}</p>}
            {syncState.ok && <p className="text-sm text-green-600">Sync triggered</p>}
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product mappings ({data?.mappings.length ?? 0})</CardTitle>
          <CardDescription>Local products mapped to Meta catalog IDs.</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.mappings.length ? (
            <ul className="divide-y text-sm">
              {data.mappings.map((m) => (
                <li key={m.id} className="py-2">
                  {m.productId} → {m.externalProductId ?? "not mapped"} · {m.status}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No mappings yet. Sync the catalog to create them.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Shoppable media</CardTitle>
          <CardDescription>Create an Instagram post or Reel with AI-suggested product tags.</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.media.length ? (
            <ul className="divide-y text-sm mb-4">
              {data.media.map((m) => (
                <li key={m.id} className="py-2">
                  {m.mediaType} · {m.status} · {m.caption ?? "no caption"} · {Array.isArray(m.productTags) ? m.productTags.length : 0} tag(s)
                </li>
              ))}
            </ul>
          ) : null}
          <form action={mediaAction} className="space-y-4">
            <input type="hidden" name="storeId" value={storeId} />
            <div>
              <Label htmlFor="mediaType">Media type</Label>
              <select name="mediaType" id="mediaType" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                <option value="POST">Instagram Post</option>
                <option value="REEL">Instagram Reel</option>
                <option value="STORY">Instagram Story</option>
              </select>
            </div>
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Textarea name="caption" id="caption" placeholder="Write a caption..." />
            </div>
            <div>
              <Label>Product tags</Label>
              <div className="grid grid-cols-2 gap-2">
                {data?.products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Input type="checkbox" name="productTagIds" value={p.id} className="h-4 w-4" />
                    {p.title}
                  </label>
                ))}
              </div>
              {data?.products.length === 0 && <p className="text-sm text-muted-foreground">No products. Connect a store and sync first.</p>}
            </div>
            <Button type="submit" disabled={mediaPending}>{mediaPending ? "Publishing…" : "Create shoppable media"}</Button>
            {mediaState.error && <p className="text-sm text-destructive">{mediaState.error}</p>}
            {mediaState.ok && <p className="text-sm text-green-600">Shoppable media created</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import {
  listGrowthAction,
  collectUgcAction,
  requestUgcRightsAction,
  approveUgcRightsAction,
  enrollAmbassadorAction,
  recordReferralAction,
  createDmCampaignAction,
  sendDmCampaignAction,
  subscribeBackInStockAction,
  notifyBackInStockAction,
} from "@/modules/growth";

export default async function GrowthPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const [data, products] = await Promise.all([
    listGrowthAction(storeId),
    ecommerceQueries.listProducts(storeId, 100),
  ]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Growth & conversational commerce</h1>
        <p className="text-sm text-muted-foreground">UGC, ambassadors, referrals, DM campaigns, and back-in-stock alerts.</p>
        <Link href={`/stores/${storeId}`} className="text-sm text-muted-foreground underline">Back to store</Link>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>UGC collection ({data.ugc.length})</CardTitle>
          <CardDescription>Collect brand mentions and manage usage-rights workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={collectUgcAction} className="grid gap-4 md:grid-cols-3 mb-4">
            <input type="hidden" name="storeId" value={storeId} />
            <Input name="creatorHandle" placeholder="Creator handle" />
            <Input name="mediaUrl" placeholder="Media URL" />
            <Input name="mediaType" placeholder="post / reel / story" />
            <Input name="source" placeholder="MENTION / TAG / HASHTAG" defaultValue="MENTION" />
            <Input name="caption" placeholder="Caption snippet" className="md:col-span-2" />
            <Button type="submit">Collect UGC</Button>
          </form>

          {data.ugc.length === 0 ? (
            <p className="text-sm text-muted-foreground">No UGC collected yet.</p>
          ) : (
            <ul className="divide-y">
              {data.ugc.map((u) => (
                <li key={u.id} className="py-2 text-sm flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{u.creatorHandle ?? "Unknown"} · {u.source} · {u.rightsStatus}</p>
                    <p className="text-muted-foreground">{u.caption ?? "—"}</p>
                    {u.mediaUrl && <p className="text-xs text-muted-foreground truncate max-w-xs">{u.mediaUrl}</p>}
                  </div>
                  <div className="flex gap-2">
                    <form action={requestUgcRightsAction}>
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="assetId" value={u.id} />
                      <Button type="submit" variant="outline" size="sm">Request rights</Button>
                    </form>
                    <form action={approveUgcRightsAction}>
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="assetId" value={u.id} />
                      <input type="hidden" name="approvedBy" value={user.email ?? "owner"} />
                      <Button type="submit" variant="outline" size="sm">Approve</Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ambassadors ({data.ambassadors.length})</CardTitle>
          <CardDescription>Enroll ambassadors and track referral orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={enrollAmbassadorAction} className="grid gap-4 md:grid-cols-4 mb-4">
            <input type="hidden" name="storeId" value={storeId} />
            <Input name="handle" placeholder="Creator handle" />
            <Input name="discountPct" type="number" placeholder="Discount %" defaultValue="10" />
            <Input name="commissionPct" type="number" placeholder="Commission %" defaultValue="5" />
            <Button type="submit">Enroll</Button>
          </form>

          {data.ambassadors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ambassadors yet.</p>
          ) : (
            <ul className="divide-y mb-4">
              {data.ambassadors.map((a) => (
                <li key={a.id} className="py-2 text-sm flex justify-between">
                  <span className="font-medium">{a.code} · {a.status} · {a.totalReferrals} referrals · ${Number(a.totalEarnings).toFixed(2)} earned</span>
                  <span className="text-muted-foreground">{a.discountPct}% off / {a.commissionPct}% commission</span>
                </li>
              ))}
            </ul>
          )}

          {data.ambassadors.length > 0 && (
            <form action={recordReferralAction} className="grid gap-4 md:grid-cols-4">
              <input type="hidden" name="storeId" value={storeId} />
              <select name="ambassadorId" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                <option value="">Select ambassador</option>
                {data.ambassadors.map((a) => (
                  <option key={a.id} value={a.id}>{a.code}</option>
                ))}
              </select>
              <Input name="orderId" placeholder="Order ID" />
              <Input name="orderAmount" type="number" step="0.01" placeholder="Order amount" />
              <Button type="submit">Record referral</Button>
            </form>
          )}

          {data.referrals.length > 0 && (
            <ul className="divide-y mt-4">
              {data.referrals.map((r) => (
                <li key={r.id} className="py-2 text-sm">
                  {r.orderId} · ${Number(r.orderAmount).toFixed(2)} · commission ${Number(r.commissionAmount).toFixed(2)} · {r.status}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>DM campaigns ({data.campaigns.length})</CardTitle>
          <CardDescription>Abandoned cart, back-in-stock, review, re-engagement, and welcome campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDmCampaignAction} className="grid gap-4 md:grid-cols-4 mb-4">
            <input type="hidden" name="storeId" value={storeId} />
            <select name="campaignType" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
              <option value="WELCOME">Welcome</option>
              <option value="ABANDONED_CART">Abandoned cart</option>
              <option value="BACK_IN_STOCK">Back in stock</option>
              <option value="REVIEW">Review request</option>
              <option value="RE_ENGAGE">Re-engage</option>
            </select>
            <Input name="audienceCriteria" placeholder="Audience description" />
            <Input name="scheduledAt" type="datetime-local" />
            <Button type="submit">Create campaign</Button>
          </form>

          {data.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            <ul className="divide-y">
              {data.campaigns.map((c) => (
                <li key={c.id} className="py-2 text-sm flex items-center justify-between">
                  <span>{c.campaignType} · {c.status} · {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "Not scheduled"}</span>
                  {c.status !== "SENT" && (
                    <form action={sendDmCampaignAction}>
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="campaignId" value={c.id} />
                      <Button type="submit" variant="outline" size="sm">Send now</Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Back-in-stock alerts ({data.backInStock.length})</CardTitle>
          <CardDescription>Customers subscribed to be notified when products are restocked.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={subscribeBackInStockAction} className="grid gap-4 md:grid-cols-3 mb-4">
            <input type="hidden" name="storeId" value={storeId} />
            <select name="productId" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <Input name="externalUserId" placeholder="External user ID" />
            <Button type="submit">Subscribe</Button>
          </form>

          {data.backInStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
          ) : (
            <ul className="divide-y">
              {data.backInStock.map((s) => (
                <li key={s.id} className="py-2 text-sm flex items-center justify-between">
                  <span>{s.productId} · {s.externalUserId ?? "Anonymous"} · {s.notifiedAt ? "Notified" : "Waiting"}</span>
                  {!s.notifiedAt && (
                    <form action={notifyBackInStockAction}>
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="subscriptionId" value={s.id} />
                      <Button type="submit" variant="outline" size="sm">Notify</Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

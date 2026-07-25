import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { growthQueries } from "@/modules/growth";
import {
  enrollAmbassadorAction,
  recordReferralAction,
} from "@/modules/growth";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AffiliatesPage({
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

  const [ambassadors, referrals] = await Promise.all([
    growthQueries.listAmbassadors(storeId, 50),
    growthQueries.listReferrals(storeId, 50),
  ]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate Center</h1>
          <p className="text-sm text-muted-foreground">
            Ambassadors and referral performance for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enroll ambassador</CardTitle>
            <CardDescription>
              Create a referral code for a creator or customer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={enrollAmbassadorAction} className="grid gap-4">
              <input type="hidden" name="storeId" value={storeId} />
              <div className="space-y-2">
                <Label htmlFor="handle">Handle / name</Label>
                <Input
                  id="handle"
                  name="handle"
                  placeholder="e.g. jane_doe"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discountPct">Discount %</Label>
                  <Input
                    id="discountPct"
                    name="discountPct"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue="10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionPct">Commission %</Label>
                  <Input
                    id="commissionPct"
                    name="commissionPct"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue="10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-fit">
                Enroll ambassador
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record referral</CardTitle>
            <CardDescription>
              Link an order to an ambassador and compute commission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={recordReferralAction} className="grid gap-4">
              <input type="hidden" name="storeId" value={storeId} />
              <div className="space-y-2">
                <Label htmlFor="ambassadorId">Ambassador</Label>
                {ambassadors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Enroll an ambassador first.
                  </p>
                ) : (
                  <select
                    id="ambassadorId"
                    name="ambassadorId"
                    required
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select ambassador</option>
                    {ambassadors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} ({a.commissionPct}% commission)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orderId">Order ID</Label>
                  <Input
                    id="orderId"
                    name="orderId"
                    placeholder="order-123"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderAmount">Order amount (₹)</Label>
                  <Input
                    id="orderAmount"
                    name="orderAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="2500"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-fit"
                disabled={ambassadors.length === 0}
              >
                Record referral
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ambassadors</CardTitle>
            <CardDescription>{ambassadors.length} enrolled.</CardDescription>
          </CardHeader>
          <CardContent>
            {ambassadors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No ambassadors yet. Enroll your first one above.
              </p>
            ) : (
              <ul className="space-y-3">
                {ambassadors.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{a.code}</p>
                      <p className="text-muted-foreground">
                        {a.discountPct}% discount · {a.commissionPct}%
                        commission
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{a.totalReferrals}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(a.totalEarnings, "INR")} earned
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referrals</CardTitle>
            <CardDescription>{referrals.length} recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No referrals yet. Record one above.
              </p>
            ) : (
              <ul className="space-y-3">
                {referrals.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{r.orderId}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(r.orderAmount, "INR")} order
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(r.commissionAmount, "INR")}
                      </p>
                      <p className="text-muted-foreground">{r.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

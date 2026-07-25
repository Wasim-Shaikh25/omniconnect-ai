import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { brandDealQueries } from "@/modules/branddeals";
import { BrandDealsNextBestAction } from "@/components/brand-deals-next-best-action";
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
import { Textarea } from "@/components/ui/textarea";
import { createBrandDealAction } from "@/modules/branddeals";

const statusOrder = [
  "LEAD",
  "NEGOTIATING",
  "CONTRACTED",
  "DELIVERED",
  "PAID",
  "CLOSED",
] as const;

const statusLabels: Record<string, string> = {
  LEAD: "Lead",
  NEGOTIATING: "Negotiating",
  CONTRACTED: "Contracted",
  DELIVERED: "Delivered",
  PAID: "Paid",
  CLOSED: "Closed",
};

export default async function BrandDealsPage({
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

  const deals = await brandDealQueries.listByStore(storeId);

  const grouped = deals.reduce<Record<string, typeof deals>>((acc, deal) => {
    if (!acc[deal.status]) acc[deal.status] = [];
    acc[deal.status].push(deal);
    return acc;
  }, {});

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Brand Deals</h1>
          <p className="text-sm text-muted-foreground">
            Sponsor pipeline for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <BrandDealsNextBestAction storeId={storeId} />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a deal</CardTitle>
          <CardDescription>
            Record a new brand sponsorship opportunity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createBrandDealAction}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="storeId" value={storeId} />
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand name</Label>
              <Input
                id="brandName"
                name="brandName"
                placeholder="e.g. Nike"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="partner@brand.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Deal value (₹)</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min={0}
                step={0.01}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue="LEAD"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {statusOrder.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Deliverables, contact history, next steps..."
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm">
                Add deal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No brand deals yet. Add your first sponsor lead above.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statusOrder.map((status) => {
            const items = grouped[status] ?? [];
            return (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {statusLabels[status]}
                  </CardTitle>
                  <CardDescription>
                    {items.length} deal{items.length === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deals.</p>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((deal) => (
                        <li
                          key={deal.id}
                          className="rounded-md border p-3 text-sm"
                        >
                          <p className="font-medium">{deal.brandName}</p>
                          {deal.contactEmail && (
                            <p className="text-muted-foreground">
                              {deal.contactEmail}
                            </p>
                          )}
                          {deal.value !== null && deal.value !== undefined && (
                            <p className="text-muted-foreground">
                              {formatCurrency(deal.value, "INR")}
                            </p>
                          )}
                          {deal.notes && (
                            <p className="mt-1 line-clamp-2 text-muted-foreground">
                              {deal.notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

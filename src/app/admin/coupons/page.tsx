import { listSaaSCouponsAction, createSaaSCouponAction } from "@/modules/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSaaSCouponForm } from "@/components/create-saas-coupon-form";

interface AdminCouponsPageProps {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

function parsePage(raw: string | undefined) {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseLimit(raw: string | undefined) {
  const n = Number.parseInt(raw ?? "20", 10);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 20;
}

export default async function AdminCouponsPage({ searchParams }: AdminCouponsPageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const result = await listSaaSCouponsAction(page, limit);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create SaaS coupon</CardTitle>
          <CardDescription>Generate a percentage discount coupon. Requires Stripe keys.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSaaSCouponForm action={createSaaSCouponAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupons</CardTitle>
          <CardDescription>{result.total} total</CardDescription>
        </CardHeader>
        <CardContent>
          {result.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coupons created yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left">
                    <tr>
                      <th className="pb-2 pr-4">Code</th>
                      <th className="pb-2 pr-4">Discount</th>
                      <th className="pb-2 pr-4">Uses</th>
                      <th className="pb-2 pr-4">Expires</th>
                      <th className="pb-2 pr-4">Plans</th>
                      <th className="pb-2 pr-4">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((coupon) => (
                      <tr key={coupon.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{coupon.code}</td>
                        <td className="py-2 pr-4">{coupon.discountPct}%</td>
                        <td className="py-2 pr-4">
                          {coupon.usedCount}
                          {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                        </td>
                        <td className="py-2 pr-4">
                          {coupon.expiresAt ? coupon.expiresAt.toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {coupon.appliesTo.length ? coupon.appliesTo.join(", ") : "All"}
                        </td>
                        <td className="py-2 pr-4">{coupon.isActive ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav aria-label="Coupon pagination" className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {result.page} of {result.totalPages}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <a
                      href={`/admin/coupons?page=${page - 1}&limit=${limit}`}
                      className="rounded-md border px-3 py-1 hover:bg-muted"
                    >
                      Previous
                    </a>
                  )}
                  {page < result.totalPages && (
                    <a
                      href={`/admin/coupons?page=${page + 1}&limit=${limit}`}
                      className="rounded-md border px-3 py-1 hover:bg-muted"
                    >
                      Next
                    </a>
                  )}
                </div>
              </nav>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { listSaaSCouponsAction, createSaaSCouponAction } from "@/modules/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSaaSCouponForm } from "@/components/create-saas-coupon-form";

export default async function AdminCouponsPage() {
  const coupons = await listSaaSCouponsAction();

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
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coupons created yet.</p>
          ) : (
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
                  {coupons.map((coupon) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

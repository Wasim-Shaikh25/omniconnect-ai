import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { customerDirectory } from "@/modules/crm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerEditForms } from "@/components/customer-edit-forms";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) redirect("/login");

  const { customerId } = await params;
  const customer = await customerDirectory.getCustomerDetail(
    user.organizationId,
    customerId,
  );
  if (!customer) notFound();

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {customer.username ?? "Unknown"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {customer.storeName} · {customer.igUserId ?? customer.fbUserId ?? "no external id"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/customers">Back to customers</Link>
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {customer.lifecycleStage.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Consent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {customer.consent.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{customer.engagementScore}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{customer.leadScore}/100</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Segment & activity</CardTitle>
          <CardDescription>
            Derived from lifecycle stage, engagement, and lead score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {customer.segment}
            </span>
          </div>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>Conversations: {customer.activity.conversationCount}</li>
            <li>Messages: {customer.activity.messageCount}</li>
            <li>Followers: {customer.activity.followerCount}</li>
            <li>Coupon usages: {customer.activity.couponUsageCount}</li>
            <li>Last active: {formatDate(customer.activity.lastMessageAt)}</li>
            <li>
              Consent updated: {formatDate(customer.consentUpdatedAt)}
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage contact</CardTitle>
          <CardDescription>
            Update lifecycle stage and marketing consent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerEditForms
            customerId={customer.id}
            lifecycleStage={customer.lifecycleStage}
            consent={customer.consent}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tags & interests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tags: {customer.tags.length > 0 ? customer.tags.join(", ") : "None"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Interests: {customer.interests.length > 0 ? customer.interests.join(", ") : "None"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coupons & usage</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.coupons.length === 0 && customer.usages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No coupons yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {customer.coupons.map((coupon) => (
                  <li key={coupon.id}>
                    {coupon.code} · {coupon.discountPct}% · {coupon.status}
                  </li>
                ))}
                {customer.usages.map((usage, i) => (
                  <li key={i}>
                    Used {usage.couponId} · {formatDate(usage.usedAt)}
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

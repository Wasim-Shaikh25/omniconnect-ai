import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { customerDirectory } from "@/modules/crm";
import { CrmNextBestAction } from "@/components/crm-next-best-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls, ListSearch } from "@/components/pagination-controls";
import type { PaginationInput } from "@/shared/kernel";

const LIFECYCLES = ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"] as const;
const CONSENTS = ["PENDING", "GRANTED", "DECLINED"] as const;
const SEGMENTS = ["VIP", "Engaged", "High intent", "New lead", "Lead", "At-risk"] as const;

function formatScore(value: number): string {
  return `${value}/100`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "10", 10) || 10));
  return { page, limit };
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    limit?: string;
    lifecycleStage?: string;
    consent?: string;
    segment?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.userId) redirect("/login");
  if (user.role === "USER" && !user.projectId) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const pagination = parsePagination(params.page, params.limit);
  const search = params.q?.trim();

  const lifecycleStage = LIFECYCLES.includes(
    params.lifecycleStage as (typeof LIFECYCLES)[number],
  )
    ? (params.lifecycleStage as (typeof LIFECYCLES)[number])
    : undefined;
  const consent = CONSENTS.includes(
    params.consent as (typeof CONSENTS)[number],
  )
    ? (params.consent as (typeof CONSENTS)[number])
    : undefined;
  const segment = SEGMENTS.includes(params.segment as (typeof SEGMENTS)[number])
    ? params.segment
    : undefined;

  const filter = {
    ...(search ? { search } : {}),
    ...(lifecycleStage ? { lifecycleStage } : {}),
    ...(consent ? { consent } : {}),
    ...(segment ? { segment } : {}),
  };

  const projectId = user.role === "USER" ? user.projectId : undefined;
  const { items: customers, total, totalPages } = await customerDirectory.listCustomersByOrganizationPaginated(
    user.userId,
    pagination,
    Object.keys(filter).length > 0 ? filter : undefined,
    projectId,
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Workspace customer directory with lifecycle, consent, and scores.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      <CrmNextBestAction />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="q" value={search ?? ""} />
            <div className="space-y-2">
              <label
                htmlFor="lifecycleStage"
                className="text-xs font-medium text-muted-foreground"
              >
                Lifecycle
              </label>
              <select
                id="lifecycleStage"
                name="lifecycleStage"
                defaultValue={lifecycleStage ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All</option>
                {LIFECYCLES.map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="consent"
                className="text-xs font-medium text-muted-foreground"
              >
                Consent
              </label>
              <select
                id="consent"
                name="consent"
                defaultValue={consent ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All</option>
                {CONSENTS.map((c) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <label
                htmlFor="segment"
                className="text-xs font-medium text-muted-foreground"
              >
                Segment
              </label>
              <select
                id="segment"
                name="segment"
                defaultValue={segment ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All</option>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 lg:col-span-5">
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              <Button asChild variant="outline">
                <Link href="/customers">Reset</Link>
              </Button>
            </div>
          </form>
          <div className="mt-4">
            <ListSearch placeholder="Search username, ID, or tag..." defaultValue={search} limit={pagination.limit} />
          </div>
        </CardContent>
      </Card>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No customers match your filters.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/stores">Simulate or connect a store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {customers.map((customer) => (
              <Card key={customer.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {customer.username ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.storeName} · {customer.igUserId ?? customer.fbUserId ?? "no external id"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                          {customer.lifecycleStage.toLowerCase()}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          customer.consent === "GRANTED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : customer.consent === "DECLINED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                              : "border"
                        }`}>
                          {customer.consent.toLowerCase()}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {customer.segment}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold">
                          {formatScore(customer.engagementScore)}
                        </p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {formatScore(customer.leadScore)}
                        </p>
                        <p className="text-xs text-muted-foreground">Lead</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {customer.activity.lastMessageAt
                            ? formatDate(customer.activity.lastMessageAt)
                            : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">Last active</p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/customers/${customer.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <PaginationControls
            page={pagination.page}
            totalPages={totalPages}
            total={total}
            search={search}
            limit={pagination.limit}
          />
        </div>
      )}
    </main>
  );
}

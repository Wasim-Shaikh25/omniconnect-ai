import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { listReportsAction, generateReportAction } from "@/modules/analytics";
import { GenerateReportForm } from "@/components/generate-report-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report } from "@/modules/analytics";

export default async function ReportsAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const access = await checkStoreAccess(storeId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.organizationId) notFound();

  const { reports, error } = await listReportsAction(storeId);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Marketing performance reports for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/analytics`}>Back to analytics</Link>
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate a report</CardTitle>
          <CardDescription>Create a weekly or monthly snapshot.</CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateReportForm action={generateReportAction} storeId={storeId} />
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      <div className="grid gap-4">
        {(reports ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No reports yet. Generate your first report above.
            </CardContent>
          </Card>
        ) : (
          (reports ?? []).map((report: Report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-base">{report.period.toLowerCase()} report</CardTitle>
                <CardDescription>{new Date(report.generatedAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(report.content, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}

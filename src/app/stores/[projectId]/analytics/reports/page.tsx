import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { listReportsAction, generateReportAction } from "@/modules/analytics";
import { PageHeader } from "@/components/page-header";
import { GenerateReportForm } from "@/components/generate-report-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report } from "@/modules/analytics";

export default async function ReportsAnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.userId) notFound();

  const { reports, error } = await listReportsAction(projectId);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Reports"
          description={`Marketing performance reports for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Reports" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Generate a report</CardTitle>
              <CardDescription>Create a weekly or monthly snapshot.</CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateReportForm action={generateReportAction} projectId={projectId} />
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="section">
            <p className="text-sm text-destructive" role="alert">{error}</p>
          </div>
        )}

        <div className="section">
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
        </div>
      </div>
    </div>
  );
}

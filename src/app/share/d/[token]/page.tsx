import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DynamicDashboard } from "@/components/dashboard/DynamicDashboard";
import { getDashboardShareByTokenAction } from "@/modules/analytics";

export default async function SharedDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getDashboardShareByTokenAction(token);

  if (share.error || !share.schema) {
    notFound();
  }

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={share.title ?? "Shared dashboard"}
          description="Read-only shared view"
          breadcrumbs={[
            { label: "Shared Dashboard" },
          ]}
        />

        <div className="section">
          <DynamicDashboard schema={share.schema} />
        </div>
      </div>
    </div>
  );
}

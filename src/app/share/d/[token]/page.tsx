import { notFound } from "next/navigation";
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
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">{share.title ?? "Shared dashboard"}</h1>
        <p className="text-sm text-muted-foreground">Read-only shared view.</p>
      </header>
      <DynamicDashboard schema={share.schema} />
    </main>
  );
}

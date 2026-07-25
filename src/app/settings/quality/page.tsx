import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRiskMitigationsAction } from "@/modules/intelligence";
import { QualityForm } from "./_quality-form";

export default async function QualitySettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const stores = overview?.stores ?? [];

  const mitigations = await getRiskMitigationsAction() ?? [];

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quality & risk</h1>
          <p className="text-sm text-muted-foreground">Run UIL quality checks and review risk mitigations.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </header>

      <div className="space-y-6">
        {stores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quality checks</CardTitle>
              <CardDescription>Run data, intelligence, AI, action, and UAT checks for a store.</CardDescription>
            </CardHeader>
            <CardContent>
              <QualityForm stores={stores} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Risk mitigations</CardTitle>
            <CardDescription>Tracked failure modes and their mitigations.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mitigations.map((m) => (
                <li key={m.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.risk}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{m.status}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{m.mitigation}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Owner: {m.owner}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

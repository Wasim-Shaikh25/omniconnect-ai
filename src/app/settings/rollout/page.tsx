import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RolloutForm } from "./_rollout-form";

export default async function RolloutSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rollout & rollback</h1>
          <p className="text-sm text-muted-foreground">Manage intelligence feature gates and rollback controls.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Rollout gates</CardTitle>
          <CardDescription>Enable stages from shadow through GA to control outbound action execution.</CardDescription>
        </CardHeader>
        <CardContent>
          <RolloutForm />
        </CardContent>
      </Card>
    </main>
  );
}

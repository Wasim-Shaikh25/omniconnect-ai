import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkStoreAccess } from "@/modules/workspaces";
import {
  generateAdapterConfigAction,
  testAdapterConfigAction,
  connectAdapterAction,
} from "@/modules/ecommerce";
import { ConnectAdapterForm } from "@/components/connect-adapter-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConnectAdapterPage({
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
  const { store, user } = access;
  const canManage = user.role === "SUPER_ADMIN" || user.role === "USER";

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Connect a custom store</h1>
          <p className="text-sm text-muted-foreground">
            Generate a dynamic adapter from API docs for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}/integrations`}>Back to integrations</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dynamic adapter</CardTitle>
          <CardDescription>
            Paste REST API documentation to generate a config mapping, enter credentials, test the connection, and save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <ConnectAdapterForm
              generateAction={generateAdapterConfigAction}
              testAction={testAdapterConfigAction}
              connectAction={connectAdapterAction}
              projectId={projectId}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners/admins can manage connections.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

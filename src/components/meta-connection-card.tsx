import Link from "next/link";
import { metaQueries } from "@/modules/meta/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MetaConnectionCardProps {
  projectId: string;
}

export async function MetaConnectionCard({ projectId }: MetaConnectionCardProps) {
  const connection = await metaQueries.getMetaConnection(projectId);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Meta connection</CardTitle>
        <CardDescription>
          Connect your Instagram Business account or Facebook Page to publish
          content, reply to DMs, and run Meta campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connection.connected && connection.integration?.accountId ? (
          <div className="text-sm">
            <p className="font-medium text-primary">Connected</p>
            <p className="text-muted-foreground">
              Account ID: {connection.integration.accountId}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No Instagram Business account or Facebook Page is connected yet.
          </p>
        )}
        <Button asChild variant={connection.connected ? "outline" : "default"} size="sm">
          <Link href={`/api/meta/auth?projectId=${encodeURIComponent(projectId)}`}>
            {connection.connected ? "Reconnect Meta" : "Connect Meta"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

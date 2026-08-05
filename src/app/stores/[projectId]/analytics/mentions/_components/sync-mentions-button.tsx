"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncMentionsAction } from "@/modules/social";

export function SyncMentionsButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          const result = await syncMentionsAction(projectId);
          if (result.ok) {
            setMessage(`Synced ${result.count ?? 0} new mentions`);
            router.refresh();
          } else {
            setMessage(result.error ?? "Sync failed");
          }
        });
      }}
    >
      <Button type="submit" disabled={pending} variant="outline" size="sm">
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Sync Mentions
      </Button>
      {message && (
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      )}
    </form>
  );
}

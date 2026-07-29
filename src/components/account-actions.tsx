"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExportRequestRecord } from "@/modules/users";
import { requestDataExportAction, deleteAccountAction } from "@/modules/users";

function isExportAvailable(ex: ExportRequestRecord): boolean {
  if (ex.status !== "COMPLETED" || !ex.downloadUrl) return false;
  if (ex.expiresAt && new Date() >= new Date(ex.expiresAt)) return false;
  return true;
}

interface AccountActionsProps {
  mode?: "export" | "delete";
  exports?: ExportRequestRecord[];
}

export function AccountActions({ mode, exports }: AccountActionsProps) {
  const [exportState, setExportState] = useState<{ error?: string; ok?: boolean; url?: string }>({});
  const [deleteState, formAction] = useActionState(deleteAccountAction, {});
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (deleteState.ok) {
      window.location.href = "/";
    }
  }, [deleteState.ok]);

  async function handleExport() {
    setExportState({});
    const result = await requestDataExportAction();
    if (result.error) {
      setExportState({ error: result.error });
    } else {
      setExportState({ ok: true, url: result.downloadUrl });
    }
  }

  return (
    <div className="space-y-6">
      {mode !== "delete" && (
        <div className="space-y-3">
          <Button onClick={handleExport} type="button">
            Export my data
          </Button>
          {exportState.ok && exportState.url && (
            <p className="text-sm text-green-600">
              Export ready: <a href={exportState.url} download className="underline">Download JSON</a>
            </p>
          )}
          {exportState.error && (
            <p className="text-sm text-red-600" role="alert">{exportState.error}</p>
          )}
          {exports && exports.length > 0 && (
            <ul className="space-y-2 text-sm">
              {exports.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between rounded border p-2">
                  <span>{ex.createdAt.toLocaleDateString()}</span>
                  {isExportAvailable(ex) ? (
                    <a href={ex.downloadUrl ?? undefined} download className="text-primary underline">Download</a>
                  ) : (
                    <span className="text-muted-foreground">Expired</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode !== "export" && (
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" placeholder="Why are you leaving?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation">Type DELETE to confirm</Label>
            <Input
              id="confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="destructive">Delete account</Button>
          {deleteState.error && (
            <p className="text-sm text-red-600" role="alert">{deleteState.error}</p>
          )}
        </form>
      )}
    </div>
  );
}

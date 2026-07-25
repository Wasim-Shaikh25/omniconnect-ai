"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { QualityReport, QualityCheck } from "@/modules/intelligence/client";
import { runQualityChecksAction } from "@/modules/intelligence/client";

interface Props {
  stores: { id: string; name: string }[];
}

export function QualityForm({ stores }: Props) {
  const [report, dispatch, isPending] = useActionState(
    async (_prev: QualityReport | null, formData: FormData) => {
      const storeId = formData.get("storeId");
      if (typeof storeId !== "string") return null;
      return runQualityChecksAction(storeId);
    },
    null,
  );

  return (
    <div className="space-y-4">
      {stores.map((store) => (
        <form key={store.id} action={dispatch} className="flex items-center justify-between rounded border p-3">
          <input type="hidden" name="storeId" value={store.id} />
          <span className="text-sm font-medium">{store.name}</span>
          <Button type="submit" size="sm" variant="outline" disabled={isPending}>
            {isPending ? "Running..." : "Run checks"}
          </Button>
        </form>
      ))}

      {report && (
        <div className="rounded border p-4">
          <p className="font-medium">
            Overall: {report.overall === "PASS" ? (
              <span className="text-green-600">Pass</span>
            ) : (
              <span className="text-red-600">Fail</span>
            )}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {report.checks.map((check: QualityCheck) => (
              <li key={check.name} className="flex items-start gap-2">
                <span className={check.passed ? "text-green-600" : "text-red-600"}>{check.passed ? "✓" : "✗"}</span>
                <span>
                  {check.name} ({check.category}) — {check.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

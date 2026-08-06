"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ManageSubscriptionButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error ?? "Could not open billing portal.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" disabled={disabled || loading} onClick={openPortal}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Opening…
        </>
      ) : (
        "Manage subscription"
      )}
    </Button>
  );
}

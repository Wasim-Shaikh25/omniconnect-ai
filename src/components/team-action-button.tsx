"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface TeamActionButtonProps {
  action: (id: string) => Promise<{ error?: string; ok?: boolean }> | Promise<void>;
  id: string;
  label: string;
  variant?: "default" | "outline" | "destructive";
}

export function TeamActionButton({ action, id, label, variant = "outline" }: TeamActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await action(id);
        })
      }
    >
      {isPending ? "..." : label}
    </Button>
  );
}
